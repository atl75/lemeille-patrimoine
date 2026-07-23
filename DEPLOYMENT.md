# Lemeille Patrimoine - Deployment Guide

## Cloud Run Deployment Configuration

### Required Settings

#### 1. Deployment Run Command

**You must update the deployment run command in your Replit settings:**

1. Open the Replit project
2. Click on the **"Deployments"** tab (or find deployment settings)
3. Update the **Run command** to:
   ```
   node scripts/start.js
   ```

This ensures the server binds correctly to `0.0.0.0` with the `PORT` environment variable that Cloud Run provides.

#### 2. Required Secrets for Deployment

Make sure these secrets are configured in your **deployment environment** (not just development):

- **`SESSION_SECRET`** - JWT signing secret for admin authentication (required)
- **`ADMIN_PASSWORD`** - Admin login password (required)
- **`DATABASE_URL`** - PostgreSQL connection string (required)
- **`NEXT_PUBLIC_SITE_URL`** - Site URL (optional, defaults to https://lemeillepatrimoine.com)

#### 3. Environment Variables

Cloud Run automatically sets:
- **`PORT`** - The port your app must listen on (usually 8080 in Cloud Run)

Our `scripts/start.js` automatically uses this PORT value.

### Build Configuration

The build command should be:
```
npm run build
```

This runs `next build` which creates the production-optimized `.next` folder.

### Port Binding

The application is configured to:
- **Listen on:** `0.0.0.0` (all network interfaces - required for Cloud Run)
- **Port:** Uses `process.env.PORT` from Cloud Run, defaults to `3000` locally
- **Health check:** The root route `/` serves as the health check endpoint

### Deployment Checklist

Before deploying, verify:

- [ ] Build completes successfully (`npm run build`)
- [ ] All required secrets are set in deployment configuration
- [ ] Deployment run command is set to `node scripts/start.js`
- [ ] Database migrations are up to date
- [ ] Custom domain DNS is configured (if using lemeillepatrimoine.com)

### Troubleshooting

#### Server doesn't start
- Check that `SESSION_SECRET` and `ADMIN_PASSWORD` are set
- Verify the run command is `node scripts/start.js`
- Check deployment logs for errors

#### Port binding errors
- Ensure run command is `node scripts/start.js` (not `npm start`)
- Our start script automatically uses Cloud Run's PORT variable

#### Database connection fails
- Verify `DATABASE_URL` secret is set in deployment
- Check that Neon database allows connections from Cloud Run IPs

### Local Testing

To test the production build locally:

```bash
# Build the application
npm run build

# Start with production server
node scripts/start.js
```

The server will start on http://0.0.0.0:3000 (or whatever PORT is set).

### Custom Domain Setup

If using lemeillepatrimoine.com:

1. Configure DNS in Squarespace/Google Domains:
   - Point A record to Cloud Run IP
   - Or use CNAME to Cloud Run URL
2. Set `NEXT_PUBLIC_SITE_URL=https://lemeillepatrimoine.com` in deployment secrets
3. Configure domain in Cloud Run deployment settings

### Health Checks

Cloud Run health checks will hit the root route `/`. The Next.js app responds with the home page, which confirms:
- Server is running
- Next.js is serving requests
- Database connection is working (if homepage queries data)

### Logs

View deployment logs in:
- Replit Deployments tab → Logs
- Or directly in Google Cloud Console for Cloud Run service
