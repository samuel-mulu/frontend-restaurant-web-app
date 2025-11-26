# Vercel Deployment Guide

This guide will help you deploy the Restaurant Menu Frontend to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A GitHub/GitLab/Bitbucket account (to connect your repository)
3. Your backend deployed and accessible (e.g., `https://restaurant-menu-backend-a9f8.onrender.com`)

## Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   
   In the project settings, go to "Environment Variables" and add:
   
   **Required:**
   - `NEXT_PUBLIC_API_URL` = `https://restaurant-menu-backend-a9f8.onrender.com/api/v1`
   
   **Optional (for local printer service):**
   - `NEXT_PUBLIC_POS_SERVICE_URL` = `http://localhost:7777` (only for local development)
   - `NEXT_PUBLIC_POS_PRINT_KEY` = `pos-printer-secret-key-2024` (only for local development)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL
   # Enter: https://restaurant-menu-backend-a9f8.onrender.com/api/v1
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://restaurant-menu-backend-a9f8.onrender.com/api/v1` |

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_POS_SERVICE_URL` | POS Printer Service URL | `http://localhost:7777` | Only for local printer service |
| `NEXT_PUBLIC_POS_PRINT_KEY` | POS Printer Service Key | `pos-printer-secret-key-2024` | Only for local printer service |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Only use these for non-sensitive configuration values.

## Build Configuration

Vercel automatically detects Next.js and uses these settings:

- **Framework Preset:** Next.js
- **Build Command:** `next build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

## Post-Deployment

1. **Verify Deployment**
   - Visit your Vercel deployment URL
   - Test login functionality
   - Verify API connections

2. **Test API Connection**
   - Open browser console
   - Check for any CORS errors
   - Verify API calls are going to the correct backend URL

3. **Update Backend CORS Settings**
   - Ensure your backend's `CORS_ORIGIN` includes your Vercel domain
   - Example: `https://your-app.vercel.app`

## Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to project settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - Update `NEXT_PUBLIC_API_URL` if needed
   - Update backend `CORS_ORIGIN` to include your custom domain

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles: `npm run build` locally

### API Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS settings include your Vercel domain
- Test backend health endpoint: `https://restaurant-menu-backend-a9f8.onrender.com/health`

### CORS Errors

- Update backend `CORS_ORIGIN` environment variable
- Include your Vercel domain (e.g., `https://your-app.vercel.app`)
- For multiple domains, use comma-separated values

### Socket.IO Connection Issues

- Verify Socket.IO URL is correctly derived from `NEXT_PUBLIC_API_URL`
- Check backend Socket.IO CORS configuration
- Ensure WebSocket connections are allowed

### Images Not Loading

- Verify Cloudinary remote pattern is in `next.config.ts`
- Check image URLs are using HTTPS
- Verify `res.cloudinary.com` is in allowed remote patterns

## Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Production (Vercel)
```env
NEXT_PUBLIC_API_URL=https://restaurant-menu-backend-a9f8.onrender.com/api/v1
```

## Monitoring

- View deployment logs in Vercel dashboard
- Monitor function execution times
- Check error logs for runtime issues
- Use Vercel Analytics for performance monitoring

## Cost Considerations

- **Hobby Plan**: Free tier available (suitable for most projects)
- **Pro Plan**: Paid plan with more features and higher limits
- **Enterprise Plan**: For large-scale applications

## Support

For issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with same configuration
4. Check [Vercel Documentation](https://vercel.com/docs)
5. Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

**Ready to deploy?** Push your code and import to Vercel!

