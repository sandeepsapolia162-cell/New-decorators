# Sepolia Decorators: beginner setup guide for Windows

This project keeps the original site as normal static HTML. D1 stores the gallery entries and new uploads. The existing image files stay in the repository; the seed file does not copy them into D1.

## What is in the site

The pages are Home, About, Services, Decoration, Catering, Portfolio, Liked Designs, Contact, and Admin. The portfolio HTML contains **132 image cards** (the previous count of 266 counted both the card and its `<img>` line), with **88 distinct image paths** used by those cards. The `images` folder has 96 files in total, including decorative assets. The import creates 132 ordered records, reusing each static URL where that photo repeats. The generated `seed-media.sql` is about 44 KB and does not store image bytes.

The Home page keeps its existing three-photo featured row, since it is a curated set. The Decoration page keeps its four existing text sections and selects the first visible image in each matching gallery category when the API responds; its original images remain as fallback. Catering has a menu PDF and a hero background, not an image gallery, so it stays static. Services has text and service cards, not a photo gallery, so it stays static. Liked Designs is a visitor's browser-local list, so it remains local and personalized rather than becoming a shared admin gallery. About and Contact have no managed gallery.

The existing theme, business copy, contact details, and photos remain unchanged. One broken portfolio image reference was corrected from `canopy1.` to the existing `canopy1.png` file.

## Before you start

1. Install **GitHub Desktop** from [desktop.github.com](https://desktop.github.com/) and sign in (or create a free GitHub account).
2. Install **Node.js LTS** from [nodejs.org](https://nodejs.org/) if `node` is not already installed. Restart PowerShell after installing it.
3. Open PowerShell: click **Start**, type **PowerShell**, and open **Windows PowerShell**.
4. Go to the project folder by copying this command and pressing **Enter**:

   ```powershell
   Set-Location "C:\Users\NAMAN\OneDrive\Documents\SEPOLIA DECORATORS"
   ```

   If Windows says the path cannot be found, open the project folder in File Explorer, click the address bar, copy the folder path, and replace the path between the quotes.

## 1. Publish the project with GitHub Desktop

1. In GitHub Desktop click **File → Add Local Repository…**.
2. Click **Choose…**, select `C:\Users\NAMAN\OneDrive\Documents\SEPOLIA DECORATORS`, then click **Add repository**.
3. If GitHub Desktop says **“This directory does not appear to be a Git repository”**, click **Create a repository** in that message. Name it `sepolia-decorators`; keep the local path set to this folder; click **Create repository**.
4. In the lower-left **Summary** box type `Prepare Cloudflare Pages site` and click **Commit to main**.
5. Click **Publish repository** near the top. Choose Private or Public, then click **Publish repository** again.

The project ignores Wrangler's local test database using `.gitignore`, so that local database is not published.

## 2. Connect GitHub to Cloudflare Pages

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com/) or create a free account.
2. Open **Workers & Pages → Create application → Pages → Connect to Git**. Approve the GitHub connection and choose the `sepolia-decorators` repository.
3. Set **Framework preset** to **None**. Leave **Build command** empty. Set **Build output directory** to `.` (a single period). Keep the root directory blank. Click **Save and Deploy**.
4. Wait until Cloudflare shows the deployment as **Success**. Open the `*.pages.dev` link it gives you.

If it says **“Build output directory not found”**, edit the Pages project build settings and set the output directory to `.`. If the deployment says **“Build failed”**, open the failed deployment and copy the first red error line; commonly the wrong repository branch or a missing output directory was selected.

## 3. Create D1 and connect it to Pages

1. In Cloudflare open **Workers & Pages → D1 SQL Database → Create database**.
2. Name it `sepolia-decorators`, then click **Create**.
3. Copy the database ID shown on its overview page.
4. In File Explorer open `wrangler.toml` in Notepad. Replace `REPLACE_WITH_D1_DATABASE_ID` with the copied ID. Do not remove the quotation marks if Cloudflare shows them in the file. Save the file.
5. Return to GitHub Desktop. The file appears under **Changes**. Type `Connect D1 database` in **Summary**, click **Commit to main**, then click **Push origin**. Wait for Pages to deploy again.
6. Back in Cloudflare open **Workers & Pages → D1 SQL Database → sepolia-decorators → Console**. You can paste the contents of `schema.sql` into the console and click **Execute**.

   Or use PowerShell. In the project folder run:

   ```powershell
   npx.cmd wrangler d1 execute sepolia-decorators --remote --file=schema.sql
   ```

   The first time, Wrangler may ask to install; type `y` and press **Enter**. If PowerShell says **“npx is not recognized”**, close PowerShell, install Node.js LTS, reopen PowerShell, and repeat. If it says **“Authentication error”**, run `npx.cmd wrangler login`, approve the browser page, then repeat the database command. If it says **“Database not found”**, check the spelling and confirm you created the database in this Cloudflare account.

7. Bind it to Pages: open **Workers & Pages → your Pages project → Settings → Functions → D1 database bindings → Add binding**. Enter `DB` as the variable name, select `sepolia-decorators`, click **Save**, then redeploy if Cloudflare asks.

## 4. Import the static gallery references

1. In PowerShell, make sure the current folder is the project folder (use the `Set-Location` command above), then run:

   ```powershell
   node scripts/seed-media.mjs
   ```

   It prints how many placements and unique image paths it found, then creates or refreshes `seed-media.sql` in this folder. The SQL contains reference rows only.

2. In Cloudflare's D1 **Console**, open the database and paste the contents of `seed-media.sql`, then click **Execute**.

   Or run:

   ```powershell
   npx.cmd wrangler d1 execute sepolia-decorators --remote --file=seed-media.sql
   ```

   The generated statements use stable IDs and `INSERT OR IGNORE`; you can rerun the import without duplicating the existing placements. If the Console reports **“no such table: categories”**, run `schema.sql` first. If the Console says **“CHECK constraint failed”**, the schema was not updated to the version in this project; confirm its `media.source` check includes `static`, and use a newly created empty D1 database before the first public launch.

## 5. Add the setup secret and create your admin

1. In Cloudflare open **Workers & Pages → your Pages project → Settings → Variables and Secrets** (in some dashboard layouts this is under **Settings → Functions → Variables and Secrets**).
2. Click **Add**, choose **Secret**, enter the name `SETUP_KEY`, and enter a long random phrase as its value. Save it for this one setup step and keep it private.
3. Redeploy the Pages project so the secret is available to Functions.
4. Open `https://YOUR-PROJECT.pages.dev/admin/setup` (replace `YOUR-PROJECT` with the project name). Enter the same setup key, your email, and a password of at least 12 characters. Click **Create administrator**.
5. Open `https://YOUR-PROJECT.pages.dev/admin` and sign in. The first-admin setup endpoint disables itself after an administrator is created.

If setup says **“Invalid setup key”**, check that the secret name is exactly `SETUP_KEY`, paste the same value, and confirm the latest Pages deployment includes the secret. If login says **“No such table”**, run the schema command again against the database bound as `DB`.

## 6. Test before touching the domain

Keep Netlify and the current domain live. Test the Pages preview first:

1. Visit Home, Decoration, Catering, Services, Portfolio, and Liked Designs on desktop and phone-sized browser windows.
2. Sign in at `/admin`. Upload an image and confirm it becomes WebP. Edit its title and alt text, hide/show it, reorder it, and delete the test upload.
3. Add a YouTube or Vimeo link, then open it from the public portfolio. If you test a local video upload, use MP4/WebM under 10 MB and check playback and seeking.
4. Add an editor and confirm it cannot add/remove/reset users or delete categories.
5. Download a ZIP backup and restore that ZIP. The restore adds missing records and skips matching IDs; it does not erase existing content.
6. Confirm that the static portfolio still appears if the dynamic API is unavailable. The original cards are present in the HTML and the enhancement script leaves them in place when its API request fails.

The site includes a PowerShell API smoke test for local use. To run it, first start a local preview from the project folder:

```powershell
npx.cmd wrangler pages dev . --ip 127.0.0.1 --port 8788 --binding SETUP_KEY=local-test-key --persist-to .wrangler/state
```

Keep that PowerShell window open. Open a second PowerShell window, go to the project folder, and run:

```powershell
.\scripts\verify-local.ps1
```

The script creates test records in Wrangler's **local** D1 database only. It uses fake test accounts and must not be run with `--remote`. Expected output begins with `PASS:` for each check. Stop the preview with **Ctrl+C** in its window.

## 7. Switch your custom domain with minimal interruption

Do not delete the Netlify site or its DNS records until the new Pages preview works and your custom domain is active on Cloudflare.

### Option A: keep your current DNS provider (try this first)

This is simplest if your current provider supports a root-domain **ALIAS**, **ANAME**, or **CNAME flattening** record.

1. In Cloudflare Pages open **your project → Custom domains → Set up a custom domain**. Add your `www` hostname and the root domain.
2. At your existing DNS provider, add the exact `www` CNAME target Cloudflare shows (usually the project’s `pages.dev` host). For the root domain, use the provider's ALIAS/ANAME/flattening record pointed to that same Pages host.
3. Keep the Netlify deployment online while DNS updates. Wait for Pages to show the custom domain as **Active** and check both HTTPS URLs.
4. In Cloudflare add a redirect rule so either the root or `www` address redirects to the one you choose as canonical. Remove old Netlify website records only after both addresses work.

If the current DNS provider says **“CNAME not allowed at root”** and has no ALIAS/ANAME/flattening option, use Option B for the root domain. Email-related MX/TXT records must be copied before changing nameservers.

### Option B: move DNS nameservers to Cloudflare

1. Add your domain to the Cloudflare account and let Cloudflare scan existing DNS records.
2. Compare the scanned records with your current provider. Copy every needed record, especially mail records, before changing anything.
3. At your domain registrar choose **Change nameservers** and paste the two Cloudflare nameservers shown on the Cloudflare overview page.
4. Wait for Cloudflare to report the domain **Active**. Add the root and `www` hostnames in Pages **Custom domains**, then set the redirect between them.
5. Keep Netlify active until Pages reports HTTPS active and the root and `www` both load correctly. Then remove only the old Netlify website records.

DNS changes can take time to spread. During that time some visitors may still reach Netlify while others reach Pages; keeping both sites live prevents an outage.

## How to use the dashboard

- **Upload images:** choose a category, then drop files into the upload area or click it to choose files. The browser resizes to at most about 1920 pixels and converts to WebP at about 80% quality. Progress and before/after sizes are shown.
- **Add videos:** paste a YouTube/Vimeo link for automatic provider detection and thumbnail. For a short file choose MP4/WebM up to 10 MB. For bigger files, use the free HandBrake tool and choose H.264 MP4 with a lower resolution or quality. A poster frame can be captured in the browser.
- **Edit:** change title, caption, alt description, category, visibility, and featured status in a media card. Static originals can be edited, reordered, hidden, or removed from the gallery; deleting their database row never deletes the file from the GitHub project. “Replace file” for a static image uploads a new D1 copy for that gallery entry.
- **Crop/rotate:** on an image card choose **Crop / rotate**, drag a rectangle over the part to keep, rotate if needed, then save. This saves a new WebP upload.
- **Reorder:** drag media cards. On touch screens, hold a card briefly and drag. The order saves to D1.
- **Bulk actions:** select cards and use hide/show, move-category, or delete. Editors may work with media; only admins can manage team accounts or delete categories.
- **Categories:** add, rename, move up/down, or delete an empty category. The dashboard warns if items still use a category; move those items first.
- **Team accounts:** an admin can add an Editor with a temporary password, reset that password, or remove the account. Ask the editor to sign in and change their password.
- **Backup/restore:** choose **Download full ZIP backup** to save `backup.json`, all uploaded files, and a list of static image paths. **Restore ZIP** accepts a ZIP made by this dashboard; it adds missing items and skips matching IDs. Keep your original project folder too, because the ZIP lists static image paths instead of copying those files.
- **Password:** use **Change my password** while signed in. This ends your sessions, then sign in with the new password.

## If you forget your admin password

There is no public password-reset link. An existing admin must reset it from **Team accounts** for an Editor. To reset the administrator:

1. Open PowerShell in the project folder and run:

   ```powershell
   .\scripts\reset-admin-password.ps1
   ```

2. Enter the admin email, then type the new 12+ character password into the hidden password prompt.
3. Run the generated SQL against the correct remote D1 database:

   ```powershell
   npx.cmd wrangler d1 execute sepolia-decorators --remote --file=reset-admin.sql
   ```

4. Delete `reset-admin.sql` after Wrangler reports success. Open `/admin` and sign in with the new password. The reset ends existing sessions.

The script writes only the salted password hash to the temporary SQL file, not the plain password. If Wrangler says **“Authentication error”**, use `npx.cmd wrangler login`, approve access in the browser, and retry. If it reports **“0 rows changed”**, check the email address and database name.

## Current free limits and care

- Cloudflare Workers Free currently allows 100,000 Function requests per day. Once exceeded, dynamic API requests can fail until the daily reset; static site files remain available.
- One free D1 database currently has a **500 MB** size limit. The **5 GB** allowance is total D1 storage across the account, not one free database. Free D1 also has daily row-read and row-write limits. When a limit is exceeded, queries can fail until the daily reset. Check **D1 → Metrics** occasionally.
- Existing static pictures do not count against D1 storage. New uploads count toward the single database's 500 MB. The dashboard shows used bytes against that limit.
- Videos are capped at 10 MB. Range requests retrieve only the D1 chunks needed for the requested part of a video. D1 is not a specialist video service; avoid building a large video archive there.
- ZIP creation and restore happen in the browser and can use considerable memory for a very large library. Save monthly backups to your computer and keep the repository copy of `images/`.
- Cloudflare currently serves Pages static files without an inactivity pause, but no company can guarantee that a free plan will stay free forever. Quotas and plan terms can change. R2 is not used because enabling it may require a payment method.

## What the local checks cover

The local smoke test passed setup, setup lockout, login, throttling, reference-only seed counts, image upload and range response, an MP4-signature test payload, YouTube link creation, media edits, reorder, hide, metadata export, admin-created editor role restrictions, and static HTML availability. The MP4 test payload checks upload/chunk/range plumbing; it is not a playable video and does not prove real-device codec compatibility. Browser WebP conversion, visual layout, actual ZIP download/restore clicks, real video playback, Cloudflare's deployed environment, and DNS/domain propagation still need your preview checklist.

The dashboard ZIP uses the store-only ZIP format and restore supports ZIPs made by this dashboard. If a backup is too large for the browser's available memory, make a D1 export with Wrangler and keep a separate copy of the project folder.
