#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
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
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:jardindigital.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
