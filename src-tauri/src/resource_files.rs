use sqlx::Row;
use std::path::Path;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_sql::DbInstances;

pub(super) fn valid_locator(kind: &str, location: &str, locator: &str) -> bool {
    if locator.trim().is_empty() || locator.chars().any(char::is_control) {
        return false;
    }
    match location {
        "url" => tauri::Url::parse(locator).is_ok_and(|url| {
            matches!(url.scheme(), "http" | "https")
                && url.host_str().is_some()
                && url.username().is_empty()
                && url.password().is_none()
        }),
        "local" => kind != "link" && absolute_locator(locator),
        _ => false,
    }
}

fn absolute_locator(locator: &str) -> bool {
    let bytes = locator.as_bytes();
    locator.starts_with('/')
        || (locator.starts_with("\\\\")
            && locator[2..]
                .split('\\')
                .filter(|part| !part.is_empty())
                .count()
                >= 2)
        || (bytes.len() >= 3
            && bytes[0].is_ascii_alphabetic()
            && bytes[1] == b':'
            && matches!(bytes[2], b'\\' | b'/'))
}

fn safe_local_file(path: &Path) -> bool {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    !matches!(
        extension.as_str(),
        "exe"
            | "com"
            | "bat"
            | "cmd"
            | "msi"
            | "ps1"
            | "vbs"
            | "vbe"
            | "js"
            | "jse"
            | "wsf"
            | "wsh"
            | "scr"
            | "lnk"
            | "url"
            | "sh"
            | "desktop"
            | "app"
            | "py"
            | "pyw"
            | "psm1"
            | "hta"
            | "jar"
            | "reg"
            | "cpl"
    )
}

fn local_open_path(locator: &str) -> Result<String, String> {
    let path = Path::new(locator);
    // Foreign-platform paths remain valid metadata but must not resolve relative
    // to the current drive when a backup is restored on another platform.
    if !path.is_absolute() || !path.is_file() {
        return Err("Archivo no disponible".into());
    }
    if !safe_local_file(path) {
        return Err("Este tipo de archivo no se puede abrir como recurso.".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|_| "Archivo no disponible".to_string())?;
    if !safe_local_file(&canonical) {
        return Err("Este tipo de archivo no se puede abrir como recurso.".into());
    }
    let canonical = canonical
        .to_str()
        .ok_or("La ruta del archivo no es válida.")?;
    // ShellExecute uses ordinary absolute Windows paths; keep the resolved
    // target while removing Rust's verbatim prefix for the external handler.
    if let Some(unc) = canonical.strip_prefix(r"\\?\UNC\") {
        Ok(format!(r"\\{unc}"))
    } else {
        Ok(canonical
            .strip_prefix(r"\\?\")
            .unwrap_or(canonical)
            .to_string())
    }
}

#[tauri::command]
pub async fn choose_resource_file(app: AppHandle, kind: String) -> Result<Option<String>, String> {
    let dialog = match kind.as_str() {
        "document" => app
            .dialog()
            .file()
            .set_title("Añadir documento")
            .add_filter(
                "Documentos",
                &[
                    "pdf", "txt", "md", "doc", "docx", "odt", "rtf", "epub", "xls", "xlsx", "ods",
                    "ppt", "pptx", "odp", "csv", "png", "jpg", "jpeg", "webp", "svg",
                ],
            ),
        "video" => app.dialog().file().set_title("Añadir vídeo").add_filter(
            "Vídeos",
            &[
                "mp4", "webm", "mkv", "mov", "avi", "m4v", "mpeg", "mpg", "ogv",
            ],
        ),
        _ => return Err("El tipo de archivo no es válido.".into()),
    };
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = dialog.blocking_pick_file() else {
            return Ok(None);
        };
        let path = file
            .into_path()
            .map_err(|_| "La ruta seleccionada no es válida.".to_string())?;
        if !path.is_absolute() || !path.is_file() {
            return Err("Archivo no disponible".into());
        }
        if !safe_local_file(&path) {
            return Err("Este tipo de archivo no se puede abrir como recurso.".into());
        }
        let path = path.to_str().ok_or("La ruta del archivo no es válida.")?;
        Ok(Some(path.to_string()))
    })
    .await
    .map_err(|_| "No se pudo seleccionar el archivo.".to_string())?
}

#[tauri::command]
pub async fn resource_file_exists(path: String) -> Result<bool, String> {
    if !valid_locator("document", "local", &path) {
        return Ok(false);
    }
    tauri::async_runtime::spawn_blocking(move || {
        let path = Path::new(&path);
        path.is_absolute() && path.is_file()
    })
    .await
    .map_err(|_| "No se pudo comprobar el archivo.".to_string())
}

#[tauri::command]
pub async fn open_resource(
    app: AppHandle,
    instances: State<'_, DbInstances>,
    resource_id: String,
) -> Result<(), String> {
    let (kind, location, locator): (String, String, String) = {
        let guard = instances.0.read().await;
        let pool = super::operations::loaded_pool(&guard)?;
        let row = sqlx::query("SELECT kind, location, locator FROM resources WHERE id = ?")
            .bind(resource_id)
            .fetch_optional(pool)
            .await
            .map_err(|_| "No se pudo cargar el recurso.".to_string())?
            .ok_or("El recurso ya no está disponible.")?;
        (row.get("kind"), row.get("location"), row.get("locator"))
    };
    if !matches!(kind.as_str(), "document" | "video" | "link")
        || !valid_locator(&kind, &location, &locator)
    {
        return Err("La dirección del recurso no es válida.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        if location == "url" {
            let url = tauri::Url::parse(&locator)
                .map_err(|_| "La dirección del recurso no es válida.".to_string())?;
            app.opener()
                .open_url(url.to_string(), None::<&str>)
                .map_err(|_| "No se pudo abrir el enlace.".to_string())
        } else {
            let canonical = local_open_path(&locator)?;
            app.opener()
                .open_path(canonical, None::<&str>)
                .map_err(|_| "No se pudo abrir el archivo.".to_string())
        }
    })
    .await
    .map_err(|_| "No se pudo abrir el recurso.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn external_urls_accept_only_http_https_without_credentials_or_control_characters() {
        assert!(valid_locator("link", "url", "https://example.com/path?q=1"));
        for value in [
            "javascript:alert(1)",
            "file:///C:/secret.txt",
            "https://user:password@example.com",
            "http://",
            "https://example.com\n",
        ] {
            assert!(!valid_locator("link", "url", value), "{value}");
        }
    }

    #[test]
    fn linked_metadata_accepts_absolute_paths_without_requiring_the_file_to_exist() {
        assert!(valid_locator("document", "local", "C:\\missing\\notes.pdf"));
        assert!(valid_locator("video", "local", "/missing/video.mp4"));
        assert!(!valid_locator("document", "local", "relative/file.pdf"));
        assert!(!valid_locator("link", "local", "C:\\notes.pdf"));
        assert!(!safe_local_file(Path::new("C:/run.EXE")));
        assert!(safe_local_file(Path::new("C:/notes.pdf")));
    }

    #[test]
    fn native_open_resolves_existing_files_and_keeps_spaces_and_shell_characters_as_path_data() {
        let path = std::env::temp_dir().join(format!(
            "jardindigital open & file-{}-{}.txt",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::write(&path, "Original bytes").unwrap();
        let resolved = local_open_path(path.to_str().unwrap()).unwrap();
        assert_eq!(
            Path::new(&resolved).canonicalize().unwrap(),
            path.canonicalize().unwrap()
        );
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "Original bytes");
        assert!(local_open_path("relative/file.txt").is_err());
        std::fs::remove_file(&path).unwrap();
        assert_eq!(
            local_open_path(path.to_str().unwrap()).unwrap_err(),
            "Archivo no disponible"
        );
    }
}
