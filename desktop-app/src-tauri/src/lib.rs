use std::collections::HashSet;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct InstallProgress {
    id: String,
    step: String,
    progress: u32,
    log: Option<String>,
}

#[tauri::command]
async fn install_app(
    app: AppHandle,
    app_id: String,
    install_command: String,
) -> Result<(), String> {
    let os = std::env::consts::OS;
    println!("[INSTALLER] Target OS: {}", os);

    let parts: Vec<&str> = install_command.split_whitespace().collect();

    if parts.is_empty() {
        return Err("Empty command".into());
    }

    // Platform specific validation and command adjustments
    let mut final_cmd = parts[0].to_string();
    let mut final_args = parts[1..].iter().map(|s| s.to_string()).collect::<Vec<String>>();

    if os == "windows" {
        // Windows: Default to winget if not specified
        if final_cmd != "winget" && final_cmd != "powershell" && final_cmd != "msiexec" {
             // If it's a generic ID, try winget
             final_args.insert(0, "install".to_string());
             final_args.insert(1, "--id".to_string());
             final_args.insert(2, final_cmd.clone());
             final_args.push("--silent".to_string());
             final_args.push("--accept-source-agreements".to_string());
             final_cmd = "winget".to_string();
        }
    } else if os == "macos" {
        // macOS: Default to brew if not specified
        if final_cmd != "brew" && final_cmd != "installer" {
            final_args.insert(0, "install".to_string());
            final_args.insert(1, final_cmd.clone());
            final_cmd = "brew".to_string();
        }
    } else if os == "linux" {
        if let Err(e) = validate_install_command(&parts) {
            return Err(e);
        }
    } else {
        return Err(format!("Unsupported operating system: {}", os));
    }

    println!("[INSTALLER] Executing: {} {:?}", final_cmd, final_args);

    let _ = app.emit(
        "install-progress",
        InstallProgress {
            id: app_id.clone(),
            step: "Authenticating...".into(),
            progress: 5,
            log: None,
        },
    );

    // Run the command
    let mut child = match Command::new(&final_cmd)
        .args(&final_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())  // Capture stderr for AI analysis
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return Err(format!("Failed to start installer ({}): {}", final_cmd, e));
        }
    };

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);
    let app_clone = app.clone();
    let id_clone = app_id.clone();

    // Monitor progress and capture logs
    let shared_logs = std::sync::Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
    let stdout_logs = shared_logs.clone();
    let id_clone_out = id_clone.clone();
    let app_clone_out = app_clone.clone();

    std::thread::spawn(move || {
        let mut current_progress = 10;
        for line in stdout_reader.lines() {
            if let Ok(l) = line {
                if current_progress < 95 {
                    current_progress += 1;
                }
                let mut logs = stdout_logs.lock().unwrap();
                logs.push(l.clone());
                let _ = app_clone_out.emit(
                    "install-progress",
                    InstallProgress {
                        id: id_clone_out.clone(),
                        step: l.chars().take(40).collect(),
                        progress: current_progress,
                        log: Some(l),
                    },
                );
            }
        }
    });

    let stderr_logs = shared_logs.clone();
    std::thread::spawn(move || {
        for line in stderr_reader.lines() {
            if let Ok(l) = line {
                let mut logs = stderr_logs.lock().unwrap();
                logs.push(l);
            }
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;

    if status.success() {
        let _ = app.emit(
            "install-progress",
            InstallProgress {
                id: app_id.clone(),
                step: "Done".into(),
                progress: 100,
                log: None,
            },
        );
        Ok(())
    } else {
        let final_logs = shared_logs.lock().unwrap().join("\n");
        // EMIT FAILURE WITH FULL LOG FOR AI ANALYSIS
        let _ = app.emit(
            "install-progress",
            InstallProgress {
                id: app_id.clone(),
                step: "Command failed. Analyzing with AI...".into(),
                progress: 0,
                log: Some(final_logs),
            },
        );
        
        Err("Command failed".into())
    }
}

#[tauri::command]
async fn uninstall_app(
    app: AppHandle,
    app_id: String,
    install_command: String,
) -> Result<(), String> {
    let parts: Vec<&str> = install_command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".into());
    }

    if let Err(e) = validate_uninstall_command(&parts) {
        return Err(e);
    }

    let _ = app.emit(
        "install-progress",
        InstallProgress {
            id: app_id.clone(),
            step: "Uninstalling...".into(),
            progress: 50,
            log: None,
        },
    );

    let mut cmd = Command::new(parts[0]);
    if parts[0] == "flatpak" {
        cmd.args(&["uninstall", "-y", &app_id]);
    } else if parts[0] == "pacman" || parts[0] == "yay" {
        cmd.args(&["-R", "--noconfirm", &app_id]);
    } else if parts[0] == "pkexec" {
        if parts.len() > 1 {
            match parts[1] {
                "pacman" => { cmd.args(&["pacman", "-R", "--noconfirm", &app_id]); },
                "apt" | "apt-get" => { cmd.args(&["apt", "remove", "-y", &app_id]); },
                "dnf" => { cmd.args(&["dnf", "remove", "-y", &app_id]); },
                _ => return Err("Unsupported pkexec command for uninstall".into())
            }
        } else {
             return Err("Unsupported pkexec command for uninstall".into());
        }
    } else if parts[0] == "snap" {
        cmd.args(&["remove", &app_id]);
    } else if parts[0] == "apt" || parts[0] == "apt-get" {
        cmd.args(&["remove", "-y", &app_id]);
    } else if parts[0] == "dnf" {
        cmd.args(&["remove", "-y", &app_id]);
    } else {
        return Err(format!("Unsupported package manager for uninstall: {}", parts[0]));
    }

    let status = cmd.status().map_err(|e| e.to_string())?;

    if status.success() {
        let _ = app.emit(
            "install-progress",
            InstallProgress {
                id: app_id.clone(),
                step: "Uninstalled".into(),
                progress: 100,
                log: None,
            },
        );
        Ok(())
    } else {
        let _ = app.emit(
            "install-progress",
            InstallProgress {
                id: app_id.clone(),
                step: "Uninstall failed".into(),
                progress: 0,
                log: None,
            },
        );
        Err("Uninstall failed".into())
    }
}

fn has_shell_metachars(s: &str) -> bool {
    s.chars()
        .any(|c| matches!(c, ';' | '&' | '|' | '>' | '<' | '`'))
}

fn validate_install_command(parts: &[&str]) -> Result<(), String> {
    let mut allowed = HashSet::new();
    allowed.insert("flatpak");
    allowed.insert("pacman");
    allowed.insert("yay");
    allowed.insert("docker");
    allowed.insert("pkexec");

    let cmd = parts[0];
    if cmd == "sudo" {
        return Err("sudo is not allowed".into());
    }
    if !allowed.contains(cmd) {
        return Err("Command not allowed".into());
    }
    if parts.iter().any(|p| has_shell_metachars(p)) {
        return Err("Invalid characters in command".into());
    }

    match cmd {
        "flatpak" => {
            if parts.len() < 3 || parts[1] != "install" {
                return Err("Invalid flatpak install command".into());
            }
        }
        "pacman" => {
            if !parts.iter().any(|p| *p == "-S") {
                return Err("Invalid pacman install command".into());
            }
        }
        "yay" => {
            if !parts.iter().any(|p| *p == "-S") {
                return Err("Invalid yay install command".into());
            }
        }
        "docker" => {
            if parts.len() < 3 || parts[1] != "run" {
                return Err("Invalid docker run command".into());
            }
        }
        _ => {}
    }

    Ok(())
}

fn validate_uninstall_command(parts: &[&str]) -> Result<(), String> {
    let cmd = parts[0];
    let allowed_uninstallers = ["flatpak", "pacman", "yay", "pkexec", "snap", "apt", "apt-get", "dnf"];
    if !allowed_uninstallers.contains(&cmd) {
        return Err(format!("Unsupported package manager for uninstall: {}", cmd));
    }
    if parts.iter().any(|p| has_shell_metachars(p)) {
        return Err("Invalid characters in command".into());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![install_app, uninstall_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
