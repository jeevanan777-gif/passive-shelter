# DEPLOYMENT GUIDE - PASSIVE SHELTER DESIGNER

Since **Passive Shelter Designer** is built as a self-contained, high-performance static web application (HTML5, CSS3, modern JavaScript, Three.js, Chart.js), it can be deployed to the public web in seconds on any free web hosting platform without building or compiling.

---

## Option 1: Instant 30-Second Deployment via Netlify Drop (Recommended)

Netlify provides a zero-install drag-and-drop deployment that gives you a **live public HTTPS URL** immediately.

1. Open your web browser and navigate to:  
   👉 **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Open Windows File Explorer and navigate to:  
   `C:\Users\jeeva\.gemini\antigravity\scratch\`
3. Drag and drop the entire folder **`passive-shelter-designer`** onto the Netlify webpage.
4. Netlify will deploy your application within 10 seconds and generate a live, shareable URL (e.g., `https://passive-shelter-designer-abc123.netlify.app`).
5. You can share this URL with your professors, project evaluators, or classmates to access from any computer, phone, or tablet!

---

## Option 2: Deploy to GitHub Pages (Best for Project Submission & Portfolio)

1. Create a free account on [GitHub.com](https://github.com) (if you don't already have one).
2. Click **New Repository** and name it `passive-shelter-designer`.
3. Choose **Public** and click **Create repository**.
4. In the repository page, click **"uploading an existing file"**.
5. Drag and drop all files and folders from `C:\Users\jeeva\.gemini\antigravity\scratch\passive-shelter-designer\`:
   - `index.html`
   - `css/` folder (with `style.css`)
   - `js/` folder (with all `.js` scripts)
   - `README.md`
6. Click **Commit changes**.
7. Go to **Settings** $\rightarrow$ **Pages** (on the left menu).
8. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
9. In 1–2 minutes, GitHub will publish your site at:  
   `https://<your-username>.github.io/passive-shelter-designer/`

---

## Option 3: Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository, or use the Vercel dashboard to drag and drop your project directory.
4. Set root directory to `./` and click **Deploy**.
5. Your app will be live at `https://passive-shelter-designer.vercel.app`.

---

## Option 4: Local Server Deployment on Your Machine

If you want to host it locally as a dedicated web server on your machine:
- Double-click **`start-server.bat`** in this directory.
- It will host the application at **`http://localhost:8080/`** and launch your browser automatically.
