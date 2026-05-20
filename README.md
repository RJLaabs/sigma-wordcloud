# Sigma Word Cloud Plugin

Word cloud visualization plugin for Sigma Computing. Takes a **Term** column and a **Count** column and renders a sized, colored word cloud.

## Deploy to Netlify (5 minutes)

1. Push this folder to a GitHub repo
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Connect your GitHub repo — Netlify auto-detects the build settings from `netlify.toml`
4. Click **Deploy site**
5. Copy the generated URL (e.g. `https://your-site-name.netlify.app`)

## Register in Sigma

1. Go to **Administration → Account → Custom Plugins**
2. Click **Add**
3. Name it `Word Cloud`
4. Paste your Netlify URL as the **Production URL**
5. Click **Create**

## Using the Plugin

In any workbook:
1. Click **+** → **UI Elements** → **Plugins** → **Word Cloud**
2. In the editor panel:
   - **Source**: select your data table/element
   - **Term Column**: the text column (search terms, job titles, etc.)
   - **Count Column**: the numeric frequency/count column

## SQL naming convention

Name your columns `term` and `count` for clarity:

```sql
SELECT
  search_term AS term,
  COUNT(*) AS count
FROM your_table
GROUP BY 1
ORDER BY 2 DESC
LIMIT 100
```
