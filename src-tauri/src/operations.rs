use serde::{Deserialize, Serialize};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};

const DATABASE_URL: &str = "sqlite:jardindigital.db";

pub(super) fn loaded_pool<'a>(
    instances: &'a std::collections::HashMap<String, DbPool>,
) -> Result<&'a SqlitePool, String> {
    match instances.get(DATABASE_URL) {
        Some(DbPool::Sqlite(pool)) => Ok(pool),
        _ => Err("La base de datos local no está lista. Inténtalo de nuevo.".into()),
    }
}

async fn delete_knowledge_in(pool: &SqlitePool, node_id: &str) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM inbox_items WHERE node_id = ?")
        .bind(node_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM placements WHERE node_id = ?")
        .bind(node_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM edges WHERE source_node_id = ? OR target_node_id = ?")
        .bind(node_id)
        .bind(node_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM resources WHERE node_id = ?")
        .bind(node_id)
        .execute(&mut *tx)
        .await?;
    let result = sqlx::query("DELETE FROM nodes WHERE id = ?")
        .bind(node_id)
        .execute(&mut *tx)
        .await?;
    if result.rows_affected() != 1 {
        return Err(sqlx::Error::RowNotFound);
    }
    tx.commit().await
}

#[tauri::command]
pub async fn delete_knowledge(
    instances: State<'_, DbInstances>,
    node_id: String,
) -> Result<(), String> {
    let guard = instances.0.read().await;
    let pool = loaded_pool(&guard)?;
    delete_knowledge_in(pool, &node_id)
        .await
        .map_err(|_| "No se pudo eliminar la idea. No se eliminó ningún dato.".into())
}

async fn delete_garden_in(pool: &SqlitePool, canvas_id: &str) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM placements WHERE canvas_id = ?")
        .bind(canvas_id)
        .execute(&mut *tx)
        .await?;
    let result = sqlx::query("DELETE FROM canvases WHERE id = ?")
        .bind(canvas_id)
        .execute(&mut *tx)
        .await?;
    if result.rows_affected() != 1 {
        return Err(sqlx::Error::RowNotFound);
    }
    tx.commit().await
}

#[tauri::command]
pub async fn delete_garden(
    instances: State<'_, DbInstances>,
    canvas_id: String,
) -> Result<(), String> {
    let guard = instances.0.read().await;
    let pool = loaded_pool(&guard)?;
    delete_garden_in(pool, &canvas_id)
        .await
        .map_err(|_| "No se pudo eliminar el jardín. No se eliminó ningún dato.".into())
}

async fn create_node_in_garden_in(
    pool: &SqlitePool,
    node: &NodeRow,
    placement: &PlacementRow,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("INSERT INTO nodes (id, title, content) VALUES (?, ?, ?)")
        .bind(&node.id)
        .bind(&node.title)
        .bind(&node.content)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO placements (id, canvas_id, node_id, x, y) VALUES (?, ?, ?, ?, ?)")
        .bind(&placement.id)
        .bind(&placement.canvas_id)
        .bind(&placement.node_id)
        .bind(placement.x)
        .bind(placement.y)
        .execute(&mut *tx)
        .await?;
    tx.commit().await
}

#[tauri::command]
pub async fn create_node_in_garden(
    instances: State<'_, DbInstances>,
    node_id: String,
    title: String,
    content: String,
    placement_id: String,
    canvas_id: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    let guard = instances.0.read().await;
    let pool = loaded_pool(&guard)?;
    let node = NodeRow {
        id: node_id.clone(),
        title,
        content,
    };
    let placement = PlacementRow {
        id: placement_id,
        canvas_id,
        node_id,
        x,
        y,
    };
    create_node_in_garden_in(pool, &node, &placement)
        .await
        .map_err(|_| "No se pudo crear la idea en el jardín. No se añadió ningún dato.".into())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct NodeRow {
    id: String,
    title: String,
    content: String,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct CanvasRow {
    id: String,
    title: String,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct PlacementRow {
    id: String,
    canvas_id: String,
    node_id: String,
    x: f64,
    y: f64,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct EdgeRow {
    id: String,
    source_node_id: String,
    target_node_id: String,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct InboxRow {
    node_id: String,
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct AppearanceRow {
    theme: String,
    canvas_background: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ResourceRow {
    id: String,
    node_id: String,
    kind: String,
    title: String,
    locator: String,
    location: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Backup {
    format: String,
    version: u32,
    nodes: Vec<NodeRow>,
    canvases: Vec<CanvasRow>,
    placements: Vec<PlacementRow>,
    edges: Vec<EdgeRow>,
    inbox_items: Vec<InboxRow>,
    appearance: AppearanceRow,
    // Version 1 did not contain resources; restoring it produces an empty resource set.
    #[serde(default)]
    resources: Vec<ResourceRow>,
}

fn valid_uuid_v4(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && bytes.iter().enumerate().all(|(index, byte)| match index {
            8 | 13 | 18 | 23 => *byte == b'-',
            14 => *byte == b'4',
            19 => matches!(*byte, b'8' | b'9' | b'a' | b'b' | b'A' | b'B'),
            _ => byte.is_ascii_hexdigit(),
        })
}

fn validate_backup(backup: &Backup) -> bool {
    backup.format == "jardindigital"
        && matches!(backup.version, 1 | 2)
        && (backup.version != 1 || backup.resources.is_empty())
        && backup.resources.iter().all(|row| {
            valid_uuid_v4(&row.id)
                && valid_uuid_v4(&row.node_id)
                && !row.title.trim().is_empty()
                && matches!(row.kind.as_str(), "document" | "video" | "link")
                && super::resource_files::valid_locator(&row.kind, &row.location, &row.locator)
        })
        && backup.nodes.iter().all(|row| {
            valid_uuid_v4(&row.id)
                && (!row.title.trim().is_empty() || !row.content.trim().is_empty())
        })
        && backup
            .canvases
            .iter()
            .all(|row| valid_uuid_v4(&row.id) && !row.title.trim().is_empty())
        && backup.placements.iter().all(|row| {
            valid_uuid_v4(&row.id)
                && valid_uuid_v4(&row.canvas_id)
                && valid_uuid_v4(&row.node_id)
                && row.x.is_finite()
                && row.y.is_finite()
        })
        && backup.edges.iter().all(|row| {
            valid_uuid_v4(&row.id)
                && valid_uuid_v4(&row.source_node_id)
                && valid_uuid_v4(&row.target_node_id)
        })
        && backup
            .inbox_items
            .iter()
            .all(|row| valid_uuid_v4(&row.node_id))
        && matches!(
            backup.appearance.theme.as_str(),
            "system" | "light" | "dark"
        )
        && matches!(
            backup.appearance.canvas_background.as_str(),
            "plain" | "dots" | "grid"
        )
}

fn parse_backup(json: &str) -> Result<Backup, String> {
    let value: serde_json::Value = serde_json::from_str(json).map_err(|_| {
        "El archivo de copia de seguridad de JardinDigital no es válido.".to_string()
    })?;
    if value.get("version").and_then(|version| version.as_u64()) == Some(2)
        && !value
            .get("resources")
            .is_some_and(|resources| resources.is_array())
    {
        return Err("La copia de seguridad no contiene la lista de recursos requerida.".into());
    }
    let backup: Backup = serde_json::from_value(value).map_err(|_| {
        "El archivo de copia de seguridad de JardinDigital no es válido.".to_string()
    })?;
    if !validate_backup(&backup) {
        return Err(
            "La copia de seguridad contiene datos no válidos o una versión incompatible.".into(),
        );
    }
    Ok(backup)
}

async fn read_backup(tx: &mut Transaction<'_, Sqlite>) -> Result<Backup, sqlx::Error> {
    let nodes = sqlx::query("SELECT id, title, content FROM nodes ORDER BY id")
        .fetch_all(&mut **tx)
        .await?
        .into_iter()
        .map(|r| NodeRow {
            id: r.get("id"),
            title: r.get("title"),
            content: r.get("content"),
        })
        .collect();
    let canvases = sqlx::query("SELECT id, title FROM canvases ORDER BY id")
        .fetch_all(&mut **tx)
        .await?
        .into_iter()
        .map(|r| CanvasRow {
            id: r.get("id"),
            title: r.get("title"),
        })
        .collect();
    let placements = sqlx::query("SELECT id, canvas_id, node_id, x, y FROM placements ORDER BY id")
        .fetch_all(&mut **tx)
        .await?
        .into_iter()
        .map(|r| PlacementRow {
            id: r.get("id"),
            canvas_id: r.get("canvas_id"),
            node_id: r.get("node_id"),
            x: r.get("x"),
            y: r.get("y"),
        })
        .collect();
    let edges = sqlx::query("SELECT id, source_node_id, target_node_id FROM edges ORDER BY id")
        .fetch_all(&mut **tx)
        .await?
        .into_iter()
        .map(|r| EdgeRow {
            id: r.get("id"),
            source_node_id: r.get("source_node_id"),
            target_node_id: r.get("target_node_id"),
        })
        .collect();
    let inbox_items = sqlx::query("SELECT node_id FROM inbox_items ORDER BY node_id")
        .fetch_all(&mut **tx)
        .await?
        .into_iter()
        .map(|r| InboxRow {
            node_id: r.get("node_id"),
        })
        .collect();
    let appearance =
        sqlx::query("SELECT theme, canvas_background FROM appearance_settings WHERE id = 1")
            .fetch_one(&mut **tx)
            .await?;
    let resources = sqlx::query(
        "SELECT id, node_id, kind, title, locator, location FROM resources ORDER BY id",
    )
    .fetch_all(&mut **tx)
    .await?
    .into_iter()
    .map(|r| ResourceRow {
        id: r.get("id"),
        node_id: r.get("node_id"),
        kind: r.get("kind"),
        title: r.get("title"),
        locator: r.get("locator"),
        location: r.get("location"),
    })
    .collect();
    Ok(Backup {
        format: "jardindigital".into(),
        version: 2,
        nodes,
        canvases,
        placements,
        edges,
        inbox_items,
        resources,
        appearance: AppearanceRow {
            theme: appearance.get("theme"),
            canvas_background: appearance.get("canvas_background"),
        },
    })
}

#[tauri::command]
pub async fn export_backup(instances: State<'_, DbInstances>) -> Result<String, String> {
    let guard = instances.0.read().await;
    let pool = loaded_pool(&guard)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|_| "No se pudo iniciar la copia de seguridad.".to_string())?;
    let backup = read_backup(&mut tx)
        .await
        .map_err(|_| "No se pudieron leer los datos para la copia de seguridad.".to_string())?;
    tx.commit()
        .await
        .map_err(|_| "No se pudo finalizar la copia de seguridad.".to_string())?;
    serde_json::to_string_pretty(&backup)
        .map_err(|_| "No se pudo generar la copia de seguridad.".into())
}

async fn restore_backup_in(pool: &SqlitePool, backup: &Backup) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM inbox_items")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM placements")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM edges").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM resources")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM nodes").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM canvases")
        .execute(&mut *tx)
        .await?;
    for row in &backup.nodes {
        sqlx::query("INSERT INTO nodes (id, title, content) VALUES (?, ?, ?)")
            .bind(&row.id)
            .bind(&row.title)
            .bind(&row.content)
            .execute(&mut *tx)
            .await?;
    }
    for row in &backup.canvases {
        sqlx::query("INSERT INTO canvases (id, title) VALUES (?, ?)")
            .bind(&row.id)
            .bind(&row.title)
            .execute(&mut *tx)
            .await?;
    }
    for row in &backup.placements {
        sqlx::query("INSERT INTO placements (id, canvas_id, node_id, x, y) VALUES (?, ?, ?, ?, ?)")
            .bind(&row.id)
            .bind(&row.canvas_id)
            .bind(&row.node_id)
            .bind(row.x)
            .bind(row.y)
            .execute(&mut *tx)
            .await?;
    }
    for row in &backup.edges {
        sqlx::query("INSERT INTO edges (id, source_node_id, target_node_id) VALUES (?, ?, ?)")
            .bind(&row.id)
            .bind(&row.source_node_id)
            .bind(&row.target_node_id)
            .execute(&mut *tx)
            .await?;
    }
    for row in &backup.inbox_items {
        sqlx::query("INSERT INTO inbox_items (node_id) VALUES (?)")
            .bind(&row.node_id)
            .execute(&mut *tx)
            .await?;
    }
    for row in &backup.resources {
        sqlx::query("INSERT INTO resources (id, node_id, kind, title, locator, location) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&row.id).bind(&row.node_id).bind(&row.kind)
            .bind(&row.title).bind(&row.locator).bind(&row.location)
            .execute(&mut *tx).await?;
    }
    sqlx::query("INSERT INTO appearance_settings (id, theme, canvas_background) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, canvas_background = excluded.canvas_background")
        .bind(&backup.appearance.theme)
        .bind(&backup.appearance.canvas_background)
        .execute(&mut *tx)
        .await?;
    let violations = sqlx::query("PRAGMA foreign_key_check")
        .fetch_all(&mut *tx)
        .await?;
    if !violations.is_empty() {
        return Err(sqlx::Error::RowNotFound);
    }
    tx.commit().await
}

#[tauri::command]
pub async fn restore_backup(instances: State<'_, DbInstances>, json: String) -> Result<(), String> {
    let backup = parse_backup(&json)?;
    let guard = instances.0.read().await;
    let pool = loaded_pool(&guard)?;
    restore_backup_in(pool, &backup).await.map_err(|_| {
        "No se pudo restaurar la copia de seguridad. Tus datos actuales se conservaron.".into()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn pool() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        for migration in crate::migrations() {
            sqlx::raw_sql(migration.sql).execute(&pool).await.unwrap();
        }
        pool
    }

    async fn count(pool: &SqlitePool, table: &str) -> i64 {
        sqlx::query_scalar::<_, i64>(&format!("SELECT count(*) FROM {table}"))
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[test]
    fn sqlite_search_matches_title_and_content_without_wildcard_expansion() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('n1','100% Garden',''),('n2','Other','CAPTURE notes'),('n3','100 plans','');")
                .execute(&pool).await.unwrap();
            let sql = "SELECT count(*) FROM nodes WHERE title LIKE $1 ESCAPE '\\' OR content LIKE $1 ESCAPE '\\'";
            let literal_percent: i64 = sqlx::query_scalar(sql)
                .bind("%100\\%%")
                .fetch_one(&pool)
                .await
                .unwrap();
            let content_case: i64 = sqlx::query_scalar(sql)
                .bind("%capture%")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(literal_percent, 1);
            assert_eq!(content_case, 1);
        });
    }

    #[test]
    fn delete_knowledge_cleans_all_relations_and_rolls_back_on_failure() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql(
                "INSERT INTO nodes VALUES ('n1','One',''),('n2','Two',''),('n3','Three','');
                INSERT INTO canvases VALUES ('c1','A'),('c2','B');
                INSERT INTO placements VALUES ('p1','c1','n1',0,0),('p2','c2','n1',0,0);
                INSERT INTO edges VALUES ('e1','n1','n2'),('e2','n3','n1'),('e3','n2','n3');
                INSERT INTO inbox_items VALUES ('n1');
                INSERT INTO resources VALUES ('r1','n1','document','Notes','C:/missing/notes.pdf','local'),('r2','n2','link','Web','https://example.com','url');",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::raw_sql("CREATE TRIGGER fail_node_delete BEFORE DELETE ON nodes WHEN OLD.id='n1' BEGIN SELECT RAISE(ABORT, 'fail'); END;")
                .execute(&pool).await.unwrap();
            assert!(delete_knowledge_in(&pool, "n1").await.is_err());
            assert_eq!(count(&pool, "nodes").await, 3);
            assert_eq!(count(&pool, "placements").await, 2);
            assert_eq!(count(&pool, "edges").await, 3);
            assert_eq!(count(&pool, "inbox_items").await, 1);
            assert_eq!(count(&pool, "resources").await, 2);
            sqlx::query("DROP TRIGGER fail_node_delete")
                .execute(&pool)
                .await
                .unwrap();
            delete_knowledge_in(&pool, "n1").await.unwrap();
            assert_eq!(count(&pool, "nodes").await, 2);
            assert_eq!(count(&pool, "placements").await, 0);
            assert_eq!(count(&pool, "edges").await, 1);
            assert_eq!(count(&pool, "inbox_items").await, 0);
            assert_eq!(count(&pool, "resources").await, 1);
        });
    }

    #[test]
    fn delete_garden_and_create_node_are_atomic() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('n1','One',''),('n2','Two',''); INSERT INTO canvases VALUES ('c1','A'); INSERT INTO placements VALUES ('p1','c1','n1',0,0); INSERT INTO edges VALUES ('e1','n1','n2'); INSERT INTO inbox_items VALUES ('n1'); INSERT INTO resources VALUES ('r1','n1','document','Notes','C:/missing/notes.pdf','local');")
                .execute(&pool).await.unwrap();
            sqlx::raw_sql("CREATE TRIGGER fail_canvas_delete BEFORE DELETE ON canvases BEGIN SELECT RAISE(ABORT, 'fail'); END;")
                .execute(&pool).await.unwrap();
            assert!(delete_garden_in(&pool, "c1").await.is_err());
            assert_eq!(count(&pool, "placements").await, 1);
            sqlx::query("DROP TRIGGER fail_canvas_delete")
                .execute(&pool)
                .await
                .unwrap();
            delete_garden_in(&pool, "c1").await.unwrap();
            assert_eq!(count(&pool, "nodes").await, 2);
            assert_eq!(count(&pool, "canvases").await, 0);
            assert_eq!(count(&pool, "edges").await, 1);
            assert_eq!(count(&pool, "inbox_items").await, 1);
            assert_eq!(count(&pool, "resources").await, 1);
            let node = NodeRow {
                id: "n3".into(),
                title: "Three".into(),
                content: "".into(),
            };
            let placement = PlacementRow {
                id: "p2".into(),
                canvas_id: "missing".into(),
                node_id: "n3".into(),
                x: 0.0,
                y: 0.0,
            };
            assert!(create_node_in_garden_in(&pool, &node, &placement)
                .await
                .is_err());
            assert_eq!(count(&pool, "nodes").await, 2);
        });
    }

    #[test]
    fn backup_restore_round_trip_and_invalid_restore_rolls_back() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('11111111-1111-4111-8111-111111111111','One','Text'); INSERT INTO canvases VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Garden'); INSERT INTO placements VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111',2,3); INSERT INTO edges VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'); INSERT INTO inbox_items VALUES ('11111111-1111-4111-8111-111111111111'); INSERT INTO resources VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','video','Video','C:/missing/movie.mp4','local');")
                .execute(&pool).await.unwrap();
            let mut tx = pool.begin().await.unwrap();
            let backup = read_backup(&mut tx).await.unwrap();
            tx.commit().await.unwrap();
            assert!(validate_backup(&backup));
            assert_eq!(backup.version, 2);
            assert_eq!(backup.resources.len(), 1);
            let json = serde_json::to_string(&backup).unwrap();
            assert!(parse_backup(&json).is_ok());
            sqlx::query("DELETE FROM inbox_items")
                .execute(&pool)
                .await
                .unwrap();
            restore_backup_in(&pool, &backup).await.unwrap();
            assert_eq!(count(&pool, "inbox_items").await, 1);
            assert_eq!(count(&pool, "edges").await, 1);
            assert_eq!(count(&pool, "resources").await, 1);
            let mut invalid = backup;
            invalid.placements[0].node_id = "missing".into();
            assert!(!validate_backup(&invalid));
            assert!(restore_backup_in(&pool, &invalid).await.is_err());
            assert_eq!(count(&pool, "nodes").await, 1);
            assert_eq!(count(&pool, "placements").await, 1);
            assert_eq!(count(&pool, "inbox_items").await, 1);
            assert_eq!(count(&pool, "resources").await, 1);
        });
    }

    #[test]
    fn permanent_delete_survives_database_reopen() {
        tauri::async_runtime::block_on(async {
            let path = std::env::temp_dir().join(format!(
                "jardindigital-delete-test-{}-{}.db",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let options = sqlx::sqlite::SqliteConnectOptions::new()
                .filename(&path)
                .create_if_missing(true)
                .foreign_keys(true);
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(options.clone())
                .await
                .unwrap();
            sqlx::raw_sql("CREATE TABLE nodes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL);
                CREATE TABLE canvases (id TEXT PRIMARY KEY, title TEXT NOT NULL);
                CREATE TABLE placements (id TEXT PRIMARY KEY, canvas_id TEXT REFERENCES canvases(id), node_id TEXT REFERENCES nodes(id), x REAL, y REAL);
                CREATE TABLE edges (id TEXT PRIMARY KEY, source_node_id TEXT REFERENCES nodes(id), target_node_id TEXT REFERENCES nodes(id));
                CREATE TABLE inbox_items (node_id TEXT PRIMARY KEY REFERENCES nodes(id));
                INSERT INTO nodes VALUES ('n1','One',''),('n2','Two','');
                INSERT INTO canvases VALUES ('c1','Garden');
                INSERT INTO placements VALUES ('p1','c1','n1',0,0);
                INSERT INTO edges VALUES ('e1','n1','n2');
                INSERT INTO inbox_items VALUES ('n1');")
                .execute(&pool).await.unwrap();
            sqlx::raw_sql(crate::migrations()[5].sql)
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO resources VALUES ('r1','n1','document','File','C:/missing/file.pdf','local')").execute(&pool).await.unwrap();
            delete_knowledge_in(&pool, "n1").await.unwrap();
            pool.close().await;
            let reopened = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(options.create_if_missing(false))
                .await
                .unwrap();
            assert_eq!(count(&reopened, "nodes").await, 1);
            assert_eq!(count(&reopened, "placements").await, 0);
            assert_eq!(count(&reopened, "edges").await, 0);
            assert_eq!(count(&reopened, "inbox_items").await, 0);
            assert_eq!(count(&reopened, "resources").await, 0);
            reopened.close().await;
            std::fs::remove_file(path).unwrap();
        });
    }

    #[test]
    fn resource_delete_failure_rolls_back_membership_placements_edges_and_node() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('n1','Idea','');
                INSERT INTO canvases VALUES ('c1','Jardín');
                INSERT INTO placements VALUES ('p1','c1','n1',0,0);
                INSERT INTO edges VALUES ('e1','n1','n1');
                INSERT INTO inbox_items VALUES ('n1');
                INSERT INTO resources VALUES ('r1','n1','document','Doc','C:/doc.pdf','local');
                CREATE TRIGGER fail_resource_delete BEFORE DELETE ON resources BEGIN SELECT RAISE(ABORT,'failure'); END;")
                .execute(&pool).await.unwrap();
            assert!(delete_knowledge_in(&pool, "n1").await.is_err());
            for table in ["nodes", "placements", "edges", "inbox_items", "resources"] {
                assert_eq!(count(&pool, table).await, 1, "{table}");
            }
        });
    }

    #[test]
    fn resource_restore_failure_keeps_every_current_row_and_appearance() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('11111111-1111-4111-8111-111111111111','Original','');
                INSERT INTO resources VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','link','Web','https://example.com','url');
                UPDATE appearance_settings SET theme='dark';")
                .execute(&pool).await.unwrap();
            let mut tx = pool.begin().await.unwrap();
            let mut backup = read_backup(&mut tx).await.unwrap();
            tx.commit().await.unwrap();
            backup.nodes[0].title = "Replacement".into();
            backup.appearance.theme = "light".into();
            sqlx::raw_sql("CREATE TRIGGER fail_resource_insert BEFORE INSERT ON resources BEGIN SELECT RAISE(ABORT,'failure'); END;")
                .execute(&pool).await.unwrap();
            assert!(restore_backup_in(&pool, &backup).await.is_err());
            let title: String = sqlx::query_scalar("SELECT title FROM nodes")
                .fetch_one(&pool)
                .await
                .unwrap();
            let theme: String = sqlx::query_scalar("SELECT theme FROM appearance_settings")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(title, "Original");
            assert_eq!(theme, "dark");
            assert_eq!(count(&pool, "resources").await, 1);
        });
    }

    #[test]
    fn legacy_v1_backup_restores_and_incomplete_v2_or_unsafe_resources_are_rejected() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::query(
                "INSERT INTO nodes VALUES ('11111111-1111-4111-8111-111111111111','Legacy','')",
            )
            .execute(&pool)
            .await
            .unwrap();
            let mut tx = pool.begin().await.unwrap();
            let backup = read_backup(&mut tx).await.unwrap();
            tx.commit().await.unwrap();
            let mut value = serde_json::to_value(&backup).unwrap();
            value.as_object_mut().unwrap().remove("resources");
            assert!(parse_backup(&value.to_string()).is_err());
            value["version"] = serde_json::json!(1);
            let legacy = parse_backup(&value.to_string()).unwrap();
            assert!(legacy.resources.is_empty());
            restore_backup_in(&pool, &legacy).await.unwrap();
            assert_eq!(count(&pool, "nodes").await, 1);
            value["version"] = serde_json::json!(2);
            value["resources"] = serde_json::json!([{
                "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "node_id": "11111111-1111-4111-8111-111111111111",
                "kind": "link", "title": "Unsafe", "location": "url", "locator": "javascript:alert(1)"
            }]);
            assert!(parse_backup(&value.to_string()).is_err());
        });
    }

    #[test]
    fn linked_original_bytes_are_never_backed_up_copied_or_deleted_and_missing_paths_restore() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            let path = std::env::temp_dir().join(format!(
                "jardindigital-linked-{}-{}.txt",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let bytes = "external file bytes that must never enter the database backup";
            std::fs::write(&path, bytes).unwrap();
            sqlx::query(
                "INSERT INTO nodes VALUES ('11111111-1111-4111-8111-111111111111','Idea','')",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query("INSERT INTO resources VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','document','Original',?,'local')")
                .bind(path.to_str().unwrap()).execute(&pool).await.unwrap();
            let mut tx = pool.begin().await.unwrap();
            let backup = read_backup(&mut tx).await.unwrap();
            tx.commit().await.unwrap();
            let json = serde_json::to_string(&backup).unwrap();
            assert!(!json.contains(bytes));
            delete_knowledge_in(&pool, "11111111-1111-4111-8111-111111111111")
                .await
                .unwrap();
            assert_eq!(std::fs::read_to_string(&path).unwrap(), bytes);
            restore_backup_in(&pool, &backup).await.unwrap();
            assert_eq!(std::fs::read_to_string(&path).unwrap(), bytes);
            std::fs::remove_file(&path).unwrap();
            restore_backup_in(&pool, &parse_backup(&json).unwrap())
                .await
                .unwrap();
            assert_eq!(count(&pool, "resources").await, 1);
            assert!(!path.exists());
        });
    }

    #[test]
    fn orphan_resource_and_duplicate_resource_ids_roll_back_the_entire_restore() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('11111111-1111-4111-8111-111111111111','Original','');
                INSERT INTO canvases VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Original garden');
                INSERT INTO placements VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111',2,3);
                INSERT INTO edges VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111');
                INSERT INTO inbox_items VALUES ('11111111-1111-4111-8111-111111111111');
                INSERT INTO resources VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','link','Original link','https://example.com','url');
                UPDATE appearance_settings SET theme='dark';")
                .execute(&pool).await.unwrap();
            let mut tx = pool.begin().await.unwrap();
            let original = read_backup(&mut tx).await.unwrap();
            tx.commit().await.unwrap();
            let original_json = serde_json::to_string(&original).unwrap();
            for failure in ["orphan", "duplicate"] {
                let mut backup = parse_backup(&original_json).unwrap();
                backup.nodes[0].title = "Replacement".into();
                backup.canvases[0].title = "Replacement garden".into();
                backup.appearance.theme = "light".into();
                if failure == "orphan" {
                    backup.resources[0].node_id = "22222222-2222-4222-8222-222222222222".into();
                } else {
                    let duplicate =
                        serde_json::from_value(serde_json::to_value(&backup.resources[0]).unwrap())
                            .unwrap();
                    backup.resources.push(duplicate);
                }
                assert!(validate_backup(&backup));
                assert!(
                    restore_backup_in(&pool, &backup).await.is_err(),
                    "{failure}"
                );
                let mut tx = pool.begin().await.unwrap();
                let after_failure = read_backup(&mut tx).await.unwrap();
                tx.commit().await.unwrap();
                assert_eq!(
                    serde_json::to_string(&after_failure).unwrap(),
                    original_json,
                    "{failure}"
                );
            }
        });
    }

    #[test]
    fn real_migrations_allow_many_to_many_self_and_duplicate_global_edges() {
        tauri::async_runtime::block_on(async {
            let pool = pool().await;
            sqlx::raw_sql("INSERT INTO nodes VALUES ('a','A',''),('b','B',''),('c','C',''),('d','D','');
                INSERT INTO edges VALUES ('ab','a','b'),('ac','a','c'),('da','d','a'),('bd','b','d'),('aa','a','a'),('ab2','a','b');")
                .execute(&pool).await.unwrap();
            assert_eq!(count(&pool, "nodes").await, 4);
            assert_eq!(count(&pool, "edges").await, 6);
            assert_eq!(count(&pool, "placements").await, 0);
            let duplicates: i64 = sqlx::query_scalar(
                "SELECT count(*) FROM edges WHERE source_node_id='a' AND target_node_id='b'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(duplicates, 2);
        });
    }
}
