fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_nodes_table",
            sql: "CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                CHECK (length(trim(title)) > 0 OR length(trim(content)) > 0)
              );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "create_canvases_and_placements_tables",
            sql: "CREATE TABLE IF NOT EXISTS canvases (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL
                  );

                  CREATE TABLE IF NOT EXISTS placements (
                    id TEXT PRIMARY KEY NOT NULL,
                    canvas_id TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    x REAL NOT NULL,
                    y REAL NOT NULL,
                    FOREIGN KEY(canvas_id) REFERENCES canvases(id),
                    FOREIGN KEY(node_id) REFERENCES nodes(id),
                    UNIQUE(canvas_id, node_id)
                  );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "create_edges_table",
            sql: "CREATE TABLE IF NOT EXISTS edges (
                    id TEXT PRIMARY KEY NOT NULL,
                    source_node_id TEXT NOT NULL,
                    target_node_id TEXT NOT NULL,
                    FOREIGN KEY(source_node_id) REFERENCES nodes(id),
                    FOREIGN KEY(target_node_id) REFERENCES nodes(id)
                  );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "create_inbox_membership_and_atomic_operations",
            sql: "CREATE TABLE IF NOT EXISTS inbox_items (
                    node_id TEXT PRIMARY KEY NOT NULL,
                    FOREIGN KEY(node_id) REFERENCES nodes(id)
                  );

                  CREATE VIEW IF NOT EXISTS capture_operations AS
                    SELECT id, title, content FROM nodes WHERE 0;

                  CREATE TRIGGER IF NOT EXISTS capture_node_and_add_to_inbox
                  INSTEAD OF INSERT ON capture_operations
                  BEGIN
                    INSERT INTO nodes (id, title, content)
                    VALUES (NEW.id, NEW.title, NEW.content);
                    INSERT INTO inbox_items (node_id) VALUES (NEW.id);
                  END;

                  CREATE VIEW IF NOT EXISTS inbox_placement_operations AS
                    SELECT id, canvas_id, node_id, x, y FROM placements WHERE 0;

                  CREATE TRIGGER IF NOT EXISTS place_node_and_remove_from_inbox
                  INSTEAD OF INSERT ON inbox_placement_operations
                  BEGIN
                    SELECT CASE
                      WHEN NOT EXISTS (
                        SELECT 1 FROM inbox_items WHERE node_id = NEW.node_id
                      )
                      THEN RAISE(ABORT, 'node_not_in_inbox')
                    END;
                    INSERT INTO placements (id, canvas_id, node_id, x, y)
                    VALUES (NEW.id, NEW.canvas_id, NEW.node_id, NEW.x, NEW.y)
                    ON CONFLICT(canvas_id, node_id) DO NOTHING;
                    DELETE FROM inbox_items WHERE node_id = NEW.node_id;
                  END;",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = migrations();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:jardindigital.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::migrations;
    use sqlx::{Connection, Row, SqliteConnection};

    const BASE_SCHEMA: &str = "CREATE TABLE nodes (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            CHECK (length(trim(title)) > 0 OR length(trim(content)) > 0)
          );
          CREATE TABLE canvases (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL
          );
          CREATE TABLE placements (
            id TEXT PRIMARY KEY NOT NULL,
            canvas_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            FOREIGN KEY(canvas_id) REFERENCES canvases(id),
            FOREIGN KEY(node_id) REFERENCES nodes(id),
            UNIQUE(canvas_id, node_id)
          );";

    async fn migrated_database() -> SqliteConnection {
        let mut connection = SqliteConnection::connect("sqlite::memory:")
            .await
            .expect("in-memory SQLite should open");
        sqlx::raw_sql(BASE_SCHEMA)
            .execute(&mut connection)
            .await
            .expect("base schema should apply");
        sqlx::raw_sql(migrations()[3].sql)
            .execute(&mut connection)
            .await
            .expect("migration v4 should apply");
        connection
    }

    async fn count(connection: &mut SqliteConnection, sql: &str) -> i64 {
        sqlx::query(sql)
            .fetch_one(connection)
            .await
            .expect("count query should succeed")
            .get(0)
    }

    #[test]
    fn migration_v4_keeps_inbox_as_node_membership_and_defines_atomic_operations() {
        let migrations = migrations();
        let migration = &migrations[3];

        assert_eq!(migration.version, 4);
        assert!(migration
            .sql
            .contains("CREATE TABLE IF NOT EXISTS inbox_items"));
        assert!(migration.sql.contains("node_id TEXT PRIMARY KEY NOT NULL"));
        assert!(migration.sql.contains("REFERENCES nodes(id)"));
        assert!(migration
            .sql
            .contains("INSTEAD OF INSERT ON capture_operations"));
        assert!(migration
            .sql
            .contains("INSTEAD OF INSERT ON inbox_placement_operations"));
        assert!(migration
            .sql
            .contains("ON CONFLICT(canvas_id, node_id) DO NOTHING"));
        assert!(migration
            .sql
            .contains("DELETE FROM inbox_items WHERE node_id = NEW.node_id"));
        assert!(!migration.sql.contains("DELETE FROM nodes"));

        tauri::async_runtime::block_on(async {
            let mut connection = migrated_database().await;
            let foreign_keys: i64 = sqlx::query("PRAGMA foreign_keys")
                .fetch_one(&mut connection)
                .await
                .expect("foreign key status should be readable")
                .get(0);
            assert_eq!(foreign_keys, 1);
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM sqlite_schema
                     WHERE name IN (
                       'inbox_items',
                       'capture_operations',
                       'capture_node_and_add_to_inbox',
                       'inbox_placement_operations',
                       'place_node_and_remove_from_inbox'
                     )",
                )
                .await,
                5,
            );
        });
    }

    #[test]
    fn capture_rolls_back_node_when_inbox_membership_insert_fails() {
        tauri::async_runtime::block_on(async {
            let mut connection = migrated_database().await;
            sqlx::raw_sql(
                "CREATE TRIGGER force_inbox_insert_failure
                 BEFORE INSERT ON inbox_items
                 WHEN NEW.node_id = 'capture-failure'
                 BEGIN
                   SELECT RAISE(ABORT, 'forced_inbox_insert_failure');
                 END;",
            )
            .execute(&mut connection)
            .await
            .expect("failure trigger should be created");

            let result = sqlx::query(
                "INSERT INTO capture_operations (id, title, content)
                 VALUES ($1, $2, $3)",
            )
            .bind("capture-failure")
            .bind("Atomic capture")
            .bind("")
            .execute(&mut connection)
            .await;

            assert!(result.is_err());
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM nodes WHERE id = 'capture-failure'",
                )
                .await,
                0,
            );
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM inbox_items
                     WHERE node_id = 'capture-failure'",
                )
                .await,
                0,
            );
        });
    }

    #[test]
    fn place_rolls_back_placement_when_inbox_membership_delete_fails() {
        tauri::async_runtime::block_on(async {
            let mut connection = migrated_database().await;
            sqlx::raw_sql(
                "INSERT INTO canvases (id, title) VALUES ('canvas-delete-failure', 'Garden');
                 INSERT INTO nodes (id, title, content)
                 VALUES ('node-delete-failure', 'Idea', '');
                 INSERT INTO inbox_items (node_id) VALUES ('node-delete-failure');
                 CREATE TRIGGER force_inbox_delete_failure
                 BEFORE DELETE ON inbox_items
                 WHEN OLD.node_id = 'node-delete-failure'
                 BEGIN
                   SELECT RAISE(ABORT, 'forced_inbox_delete_failure');
                 END;",
            )
            .execute(&mut connection)
            .await
            .expect("place failure fixture should be created");

            let result = sqlx::query(
                "INSERT INTO inbox_placement_operations
                   (id, canvas_id, node_id, x, y)
                 VALUES ($1, $2, $3, $4, $5)",
            )
            .bind("placement-delete-failure")
            .bind("canvas-delete-failure")
            .bind("node-delete-failure")
            .bind(0.0_f64)
            .bind(0.0_f64)
            .execute(&mut connection)
            .await;

            assert!(result.is_err());
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM placements
                     WHERE id = 'placement-delete-failure'",
                )
                .await,
                0,
            );
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM inbox_items
                     WHERE node_id = 'node-delete-failure'",
                )
                .await,
                1,
            );
        });
    }

    #[test]
    fn place_preserves_integrity_for_duplicate_missing_membership_and_missing_canvas() {
        tauri::async_runtime::block_on(async {
            let mut connection = migrated_database().await;
            sqlx::raw_sql(
                "INSERT INTO canvases (id, title) VALUES ('canvas-1', 'Garden');
                 INSERT INTO nodes (id, title, content) VALUES ('node-1', 'Duplicate', '');
                 INSERT INTO placements (id, canvas_id, node_id, x, y)
                 VALUES ('existing-placement', 'canvas-1', 'node-1', 10, 20);
                 INSERT INTO inbox_items (node_id) VALUES ('node-1');",
            )
            .execute(&mut connection)
            .await
            .expect("duplicate fixture should be created");

            sqlx::query(
                "INSERT INTO inbox_placement_operations
                   (id, canvas_id, node_id, x, y)
                 VALUES ('duplicate-attempt', 'canvas-1', 'node-1', 0, 0)",
            )
            .execute(&mut connection)
            .await
            .expect("duplicate should be processed without a second Placement");

            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM placements
                     WHERE canvas_id = 'canvas-1' AND node_id = 'node-1'",
                )
                .await,
                1,
            );
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM inbox_items WHERE node_id = 'node-1'",
                )
                .await,
                0,
            );

            sqlx::query(
                "INSERT INTO nodes (id, title, content)
                 VALUES ('node-without-membership', 'Not pending', '')",
            )
            .execute(&mut connection)
            .await
            .expect("non-member Node should be created");
            let missing_membership = sqlx::query(
                "INSERT INTO inbox_placement_operations
                   (id, canvas_id, node_id, x, y)
                 VALUES ('member-failure', 'canvas-1', 'node-without-membership', 0, 0)",
            )
            .execute(&mut connection)
            .await;
            assert!(missing_membership.is_err());
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM placements WHERE id = 'member-failure'",
                )
                .await,
                0,
            );

            sqlx::raw_sql(
                "INSERT INTO nodes (id, title, content)
                 VALUES ('node-missing-canvas', 'Pending', '');
                 INSERT INTO inbox_items (node_id) VALUES ('node-missing-canvas');",
            )
            .execute(&mut connection)
            .await
            .expect("missing Canvas fixture should be created");
            let missing_canvas = sqlx::query(
                "INSERT INTO inbox_placement_operations
                   (id, canvas_id, node_id, x, y)
                 VALUES ('canvas-failure', 'missing-canvas', 'node-missing-canvas', 0, 0)",
            )
            .execute(&mut connection)
            .await;
            assert!(missing_canvas.is_err());
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM placements WHERE id = 'canvas-failure'",
                )
                .await,
                0,
            );
            assert_eq!(
                count(
                    &mut connection,
                    "SELECT count(*) FROM inbox_items
                     WHERE node_id = 'node-missing-canvas'",
                )
                .await,
                1,
            );
        });
    }
}
