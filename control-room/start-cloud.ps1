# WSL starts its enabled Docker, cloud tunnel, and HDD-check services.
Start-Process -FilePath "$env:WINDIR\System32\wsl.exe" -WindowStyle Hidden -ArgumentList @('--distribution', 'Ubuntu', '--user', 'root', '--exec', '/bin/sleep', 'infinity')
