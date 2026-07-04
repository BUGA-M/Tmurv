// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, State};
use tauri::{LogicalSize, PhysicalSize};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

struct AppState {
    minimize_to_tray: AtomicBool,
}

#[tauri::command]
fn set_minimize_to_tray(state: State<'_, AppState>, enabled: bool) {
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn toggle_mini_mode(app: AppHandle, enable: bool) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or("Window not found")?;

    std::thread::spawn(move || {
        let start_size = match window.inner_size() {
            Ok(s) => s,
            Err(_) => return,
        };
        let scale_factor = match window.scale_factor() {
            Ok(sf) => sf,
            Err(_) => return,
        };
        
        let target_logical = if enable {
            LogicalSize::new(220.0, 290.0)
        } else {
            LogicalSize::new(400.0, 610.0)
        };
        
        let target_physical = target_logical.to_physical::<u32>(scale_factor);
        
        let steps = 20;
        let step_duration = std::time::Duration::from_millis(8); // ~160ms total
        
        let start_w = start_size.width as f64;
        let start_h = start_size.height as f64;
        let target_w = target_physical.width as f64;
        let target_h = target_physical.height as f64;
        
        let _ = window.set_resizable(true);
        let _ = window.set_min_size(Some(LogicalSize::new(100.0, 100.0)));
        let _ = window.set_max_size(None::<LogicalSize<f64>>);
        
        for i in 1..=steps {
            let t = i as f64 / steps as f64;
            // easeInOutQuad
            let ease_t = if t < 0.5 {
                2.0 * t * t
            } else {
                -1.0 + (4.0 - 2.0 * t) * t
            };
            
            let curr_w = start_w + (target_w - start_w) * ease_t;
            let curr_h = start_h + (target_h - start_h) * ease_t;
            
            let _ = window.set_size(PhysicalSize::new(curr_w as u32, curr_h as u32));
            std::thread::sleep(step_duration);
        }
        
        if enable {
            let _ = window.set_min_size(Some(LogicalSize::new(220.0, 290.0)));
            let _ = window.set_max_size(Some(LogicalSize::new(220.0, 290.0)));
            let _ = window.set_resizable(false);
            let _ = window.set_always_on_top(true);
        } else {
            let _ = window.set_min_size(Some(LogicalSize::new(400.0, 610.0)));
            let _ = window.set_max_size(Some(LogicalSize::new(400.0, 610.0)));
            let _ = window.set_resizable(false);
            let _ = window.set_always_on_top(false);
        }
    });

    Ok(())
}

#[tauri::command]
fn upload_sound(app: AppHandle, file_path: String) -> Result<String, String> {
    let source_path = Path::new(&file_path);
    if !source_path.exists() || !source_path.is_file() {
        return Err("The source file does not exist or is not a valid file.".into());
    }

    let kind = infer::get_from_path(source_path)
        .map_err(|e| format!("Error reading file: {}", e))?;
    
    let is_valid_audio = match kind {
        Some(k) => matches!(k.mime_type(), "audio/mpeg" | "audio/x-wav" | "audio/wav"),
        None => false,
    };

    if !is_valid_audio {
        return Err("Invalid file format. Only valid audio files (MP3, WAV) are accepted (Magic Number mismatch).".into());
    }

    let file_name = source_path
        .file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .into_owned();

    let safe_file_name = file_name.replace("/", "").replace("\\", "");

    let app_config_dir = app.path().app_config_dir().map_err(|_| "Unable to get the configuration directory".to_string())?;
    let sounds_dir = app_config_dir.join("sounds");

    if !sounds_dir.exists() {
        fs::create_dir_all(&sounds_dir).map_err(|e| format!("Unable to create sounds directory: {}", e))?;
    }

    let dest_path = sounds_dir.join(&safe_file_name);
    fs::copy(source_path, &dest_path).map_err(|e| format!("Error copying file: {}", e))?;

    Ok(safe_file_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            minimize_to_tray: AtomicBool::new(true), // Default is true
        })
        .invoke_handler(tauri::generate_handler![upload_sound, set_minimize_to_tray, toggle_mini_mode])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit Tmurv", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Tmurv", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show_i, &separator, &quit_i])?;

            let tray_icon = app.default_window_icon().cloned()
                .expect("Failed to load tray icon");

            let _tray = TrayIconBuilder::with_id("tmurv-tray")
                .icon(tray_icon)
                .tooltip("Tmurv - Pomodoro Timer")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
