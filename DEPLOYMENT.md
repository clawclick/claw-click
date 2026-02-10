# Claw.click Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] GitHub repository: https://github.com/clawclick/claw-click
- [x] Next.js app structure in `/app`
- [x] `vercel.json` configuration at root
- [x] Environment variables defined
- [x] Project pushed to GitHub

## 🚀 Deployment Options

### Option 1: Vercel Dashboard (Recommended - 5 minutes)

1. **Go to Vercel**: https://vercel.com/new

2. **Import Repository**:
   - Click "Import Git Repository"
   - Select or search for: `clawclick/claw-click`
   - Click "Import"

3. **Configure Project**:
   ```
   Framework Preset: Next.js
   Root Directory: (leave blank)
   Build Command: cd app && npm install && npm run build
   Output Directory: app/.next
   Install Command: cd app && npm install
   ```

4. **Environment Variables**:
   Add these in the Environment Variables section:
   ```
   NEXT_PUBLIC_APP_NAME=Claw.click
   NEXT_PUBLIC_TAGLINE=Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - You'll get a URL like: `claw-click.vercel.app`

6. **Add Custom Domain** (After deployment):
   - Go to Project Settings > Domains
   - Add: `claw.click`
   - Add: `www.claw.click`
   - Follow DNS instructions

---

### Option 2: Vercel CLI (Advanced)

1. **Login to Vercel**:
   ```bash
   cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click
   vercel login
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Follow prompts**:
   - Set up and deploy? `Y`
   - Which scope? (Select your account)
   - Link to existing project? `N`
   - What's your project's name? `claw-click`
   - In which directory is your code located? `./`
   - Want to override settings? `Y`
   - Build Command: `cd app && npm install && npm run build`
   - Output Directory: `app/.next`
   - Development Command: `cd app && npm run dev`

---

## 🌐 Domain Configuration (claw.click)

### After Deployment on Vercel:

1. **In Vercel Dashboard**:
   - Go to your project
   - Settings > Domains
   - Add Domain: `claw.click`
   - Vercel will provide DNS records

2. **Update Your Domain Registrar**:
   Add these DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME  
   Name: www
   Value: claw-click.vercel-dns.com
   ```

3. **Verification**:
   - Wait 5-10 minutes for DNS propagation
   - Vercel will automatically issue SSL certificate
   - Your site will be live at https://claw.click

---

## ⚙️ Environment Variables (For Vercel)

Make sure these are set in Vercel Dashboard:

```env
NEXT_PUBLIC_APP_NAME=Claw.click
NEXT_PUBLIC_TAGLINE=Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.
```

---

## 🔍 Troubleshooting

### Build Fails?
- Check that `/app` directory has all files
- Verify `package.json` is correct
- Check build logs for specific errors

### Domain Not Working?
- DNS propagation can take up to 24 hours
- Verify DNS records are correct
- Clear browser cache

### 404 Errors?
- Check Output Directory is set to `app/.next`
- Verify Build Command includes `cd app &&`

---

## 📝 Post-Deployment Checklist

- [ ] Verify site loads at Vercel URL
- [ ] Check all pages work correctly
- [ ] Add custom domain (claw.click)
- [ ] Verify SSL certificate
- [ ] Test on mobile
- [ ] Update README with live URL

---

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all configuration matches this guide
3. Check GitHub repository has latest code
4. Try redeploying from Vercel dashboard

---

**Ready to deploy!** Follow Option 1 for the easiest deployment. 🚀
