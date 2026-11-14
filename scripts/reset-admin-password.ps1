# Generates a one-time SQL reset file. It never writes your plain password to disk.
$ErrorActionPreference = 'Stop'
$email = Read-Host 'Admin email address'
$secure = Read-Host 'New password (12 or more characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
if ($password.Length -lt 12) { throw 'Password must be at least 12 characters.' }
$saltBytes = [byte[]]::new(24)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($saltBytes)
$salt = [Convert]::ToHexString($saltBytes).ToLowerInvariant()
$passwordBytes = [Text.Encoding]::UTF8.GetBytes($password)
$saltTextBytes = [Text.Encoding]::UTF8.GetBytes($salt)
$derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($passwordBytes, $saltTextBytes, 310000, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
try { $hash = [Convert]::ToHexString($derive.GetBytes(32)).ToLowerInvariant() }
finally { $derive.Dispose(); [Array]::Clear($passwordBytes, 0, $passwordBytes.Length); $password = $null }
$safeEmail = $email.Replace("'", "''")
$sql = "UPDATE users SET password_hash='$hash', salt='$salt' WHERE email='$safeEmail' COLLATE NOCASE;`nDELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE email='$safeEmail' COLLATE NOCASE);`n"
$output = Join-Path (Get-Location) 'reset-admin.sql'
[IO.File]::WriteAllText($output, $sql, [Text.UTF8Encoding]::new($false))
Write-Host "Created reset-admin.sql for $email. Run the Wrangler command in README, then delete this file."
