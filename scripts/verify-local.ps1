# Local API smoke checks for the disposable Wrangler D1 database.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$base = if ($env:SEPOLIA_TEST_URL) { $env:SEPOLIA_TEST_URL } else { 'http://127.0.0.1:8788' }
$origin = @{ Origin = $base }
$passed = [System.Collections.Generic.List[string]]::new()
$testSuffix = [Guid]::NewGuid().ToString('N')
$adminPassword = "Local-Admin-$testSuffix!Aa9"
$editorPassword = "Local-Editor-$testSuffix!Aa9"
$resetEditorPassword = "Local-Reset-$testSuffix!Aa9"
function Api($path, $method='GET', $headers=@{}, $body=$null) {
  $all = @{}; foreach ($k in $headers.Keys) { $all[$k] = $headers[$k] }
  if ($method -ne 'GET') { $all['Origin'] = $base }
  $args = @{ Uri="$base$path"; Method=$method; Headers=$all; SkipHttpErrorCheck=$true }
  if ($null -ne $body) { $args['ContentType']='application/json'; $args['Body']=($body | ConvertTo-Json -Depth 10 -Compress) }
  Invoke-WebRequest @args
}
function Assert($condition, $message) { if (-not $condition) { throw "FAIL: $message" }; $script:passed.Add($message) }

$status = Api '/api/setup-status'
Assert ($status.StatusCode -eq 200 -and (ConvertFrom-Json $status.Content).needed) 'First-admin setup status'
$setup = Invoke-WebRequest -Uri "$base/api/setup" -Method Post -Headers @{ 'x-setup-key'='local-setup-key-for-test'; Origin=$base } -ContentType 'application/json' -Body (@{email='owner@example.test';password=$adminPassword} | ConvertTo-Json -Compress) -SkipHttpErrorCheck
Assert ($setup.StatusCode -eq 200) 'First-admin setup succeeds'
$setupAgain = Invoke-WebRequest -Uri "$base/api/setup" -Method Post -Headers @{ 'x-setup-key'='local-setup-key-for-test'; Origin=$base } -ContentType 'application/json' -Body (@{email='second@example.test';password=$adminPassword} | ConvertTo-Json -Compress) -SkipHttpErrorCheck
Assert ($setupAgain.StatusCode -eq 409) 'One-time setup disables after admin creation'
$login = Api '/api/login' 'POST' @{} @{email='owner@example.test';password=$adminPassword}
Assert ($login.StatusCode -eq 200) 'Admin login'
$cookie = (($login.Headers['Set-Cookie'] -split ';')[0])
$auth = @{Cookie=$cookie}
$media = (ConvertFrom-Json (Api '/api/media').Content)
Assert ($media.Count -eq 132 -and @($media | Select-Object -ExpandProperty source -Unique).Count -eq 1 -and $media[0].source -eq 'static') 'Public static media references'
$summary = ConvertFrom-Json (Api '/api/admin/summary' 'GET' $auth).Content
Assert ($summary.count -eq 132 -and $summary.bytes -eq 0) 'Static gallery adds no bytes to D1 storage'
$content = [byte[]](0x52,0x49,0x46,0x46,0x04,0,0,0,0x57,0x45,0x42,0x50,0x41,0x42,0x43,0x44)
$meta = @{type='image';mime_type='image/webp';title='Local Test';alt_text='Test description';category_id=$media[0].category_id;width=1;height=1}
$head = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($meta | ConvertTo-Json -Compress)))
$upload = Invoke-WebRequest -Uri "$base/api/admin/media" -Method Post -Headers (@{Cookie=$cookie;Origin=$base; 'Content-Type'='application/octet-stream';'X-Media-Meta'=$head}) -Body $content -SkipHttpErrorCheck
Assert ($upload.StatusCode -eq 200) 'Image upload and chunk storage'
$newId = (ConvertFrom-Json $upload.Content).id
$range = Invoke-WebRequest -Uri "$base/api/file/$newId" -Method Get -Headers @{Range='bytes=3-10'} -SkipHttpErrorCheck
Assert ($range.StatusCode -eq 206 -and $range.Headers['Content-Range'] -eq 'bytes 3-10/16' -and $range.RawContentLength -eq 8) 'Image byte-range response'
$videoBytes = [byte[]]::new(1048576 + 16)
[Array]::Copy([Text.Encoding]::ASCII.GetBytes('0000ftypisom'), $videoBytes, 12)
$videoMeta = @{type='video';mime_type='video/mp4';title='Range Test Video';category_id=$media[0].category_id}
$videoHeader = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($videoMeta | ConvertTo-Json -Compress)))
$videoUpload = Invoke-WebRequest -Uri "$base/api/admin/media" -Method Post -Headers (@{Cookie=$cookie;Origin=$base;'Content-Type'='application/octet-stream';'X-Media-Meta'=$videoHeader}) -Body $videoBytes -SkipHttpErrorCheck
Assert ($videoUpload.StatusCode -eq 200) '10 MB-capped MP4 chunk upload route'
$videoId = (ConvertFrom-Json $videoUpload.Content).id
$videoRange = Invoke-WebRequest -Uri "$base/api/file/$videoId" -Method Get -Headers @{Range='bytes=1048575-1048577'} -SkipHttpErrorCheck
Assert ($videoRange.StatusCode -eq 206 -and $videoRange.Headers['Content-Range'] -eq 'bytes 1048575-1048577/1048592' -and $videoRange.RawContentLength -eq 3) 'Range request spanning two chunks returns only requested bytes'
$patch = Api "/api/admin/media/$newId" 'PATCH' $auth @{title='Edited Test';caption='Caption';is_featured=$true}
Assert ($patch.StatusCode -eq 200) 'Edit media metadata and featured flag'
$replaceMeta = @{data=[Convert]::ToBase64String($content);mime_type='image/webp';width=1;height=1}
$replace = Api "/api/admin/media/$newId/replace" 'POST' $auth $replaceMeta
Assert ($replace.StatusCode -eq 200) 'Replace an uploaded image file'
$link = Api '/api/admin/media/link' 'POST' $auth @{url='https://youtu.be/dQw4w9WgXcQ';title='YouTube Test';category_id=$media[0].category_id}
Assert ($link.StatusCode -eq 200 -and (ConvertFrom-Json $link.Content).provider -eq 'youtube') 'YouTube link provider and thumbnail creation'
$reorder = Api '/api/admin/reorder' 'POST' $auth @{ids=@($newId,$media[0].id)}
Assert ($reorder.StatusCode -eq 200) 'Media reorder endpoint'
$hide = Api '/api/admin/bulk' 'POST' $auth @{ids=@($newId);action='hide'}
Assert ($hide.StatusCode -eq 200) 'Bulk hide endpoint'
$show = Api '/api/admin/bulk' 'POST' $auth @{ids=@($newId);action='show'}
Assert ($show.StatusCode -eq 200) 'Bulk show endpoint'
$categoryAdd = Api '/api/admin/categories' 'POST' $auth @{name='Local Test Category'}
$categoryId = (ConvertFrom-Json $categoryAdd.Content).id
$categoryRename = Api "/api/admin/categories/$categoryId" 'PATCH' $auth @{name='Renamed Test Category'}
Assert ($categoryAdd.StatusCode -eq 200 -and $categoryRename.StatusCode -eq 200) 'Add and rename category'
$categoryReorder = Api '/api/admin/categories/reorder' 'POST' $auth @{ids=@($categoryId,$media[0].category_id)}
Assert ($categoryReorder.StatusCode -eq 200) 'Reorder categories'
$categoryDelete = Api "/api/admin/categories/$categoryId" 'DELETE' $auth
Assert ($categoryDelete.StatusCode -eq 200) 'Delete an empty category'
$backup = Api '/api/admin/export' 'GET' $auth
Assert ($backup.StatusCode -eq 200 -and (ConvertFrom-Json $backup.Content).static_files.Count -gt 0 -and (ConvertFrom-Json $backup.Content).media.source -contains 'upload') 'Backup metadata includes static paths and uploaded media'
$restoreMeta = @{id='restore-test-image-01';type='image';title='Restored Test';caption='';alt_text='';category_id=$media[0].category_id;source='upload';external_url=$null;poster_url=$null;mime_type='image/webp';width=1;height=1;thumbnail_id=$null;sort_order=900;is_visible=1;is_featured=0}
$restoreHeader = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($restoreMeta | ConvertTo-Json -Compress)))
$restored = Invoke-WebRequest -Uri "$base/api/admin/restore/item" -Method Post -Headers (@{Cookie=$cookie;Origin=$base;'Content-Type'='application/octet-stream';'X-Media-Meta'=$restoreHeader}) -Body $content -SkipHttpErrorCheck
Assert ($restored.StatusCode -eq 200) 'Restore accepts an uploaded file and recreates its chunks'
$deleteRestored = Api '/api/admin/media/restore-test-image-01' 'DELETE' $auth
Assert ($deleteRestored.StatusCode -eq 200) 'Restored fixture can be removed safely'
$addEditor = Api '/api/admin/users' 'POST' $auth @{email='editor@example.test';password=$editorPassword}
Assert ($addEditor.StatusCode -eq 200) 'Admin creates editor account'
$editorLogin = Api '/api/login' 'POST' @{} @{email='editor@example.test';password=$editorPassword}
$editorCookie = (($editorLogin.Headers['Set-Cookie'] -split ';')[0]);$editorAuth=@{Cookie=$editorCookie}
$usersDenied = Api '/api/admin/users' 'GET' $editorAuth
$categoryDeleteDenied = Api "/api/admin/categories/$($media[0].category_id)" 'DELETE' $editorAuth
Assert ($usersDenied.StatusCode -eq 403 -and $categoryDeleteDenied.StatusCode -eq 403) 'Editor is blocked from user management and category deletion'
$resetEditor = Api "/api/admin/users/$((ConvertFrom-Json $addEditor.Content).id)" 'PATCH' $auth @{password=$resetEditorPassword}
$oldEditorSession = Api '/api/admin/session' 'GET' $editorAuth
Assert ($resetEditor.StatusCode -eq 200 -and $oldEditorSession.StatusCode -eq 401) 'Admin resets editor password and expires existing sessions'
$editorNewLogin = Api '/api/login' 'POST' @{} @{email='editor@example.test';password=$resetEditorPassword}
Assert ($editorNewLogin.StatusCode -eq 200) 'Editor can sign in with reset password'
$removeEditor = Api "/api/admin/users/$((ConvertFrom-Json $addEditor.Content).id)" 'DELETE' $auth
Assert ($removeEditor.StatusCode -eq 200) 'Admin removes editor account'
$wrongCount=0;for($i=0;$i -lt 8;$i++){ $bad=Api '/api/login' 'POST' @{} @{email='owner@example.test';password='wrong-password'};if($bad.StatusCode -eq 401){$wrongCount++} }
$throttled=Api '/api/login' 'POST' @{} @{email='owner@example.test';password=$adminPassword}
Assert ($wrongCount -eq 8 -and $throttled.StatusCode -eq 429) 'Login throttling after repeated failures'
$page=Invoke-WebRequest -Uri "$base/portfolio.html" -SkipHttpErrorCheck
Assert ($page.StatusCode -eq 200 -and $page.Content.Contains('images/front-gate/frontgate-02.png')) 'Static portfolio HTML remains available as fallback'
$passed | ForEach-Object { "PASS: $_" }
