# 🚀 Production Deployment Checklist

## Build Status ✅

```
✅ Frontend (React SPA)
   - Compiled: dist/spa/index.html
   - Assets: dist/spa/assets/
   - Size: 577 kB (179 kB gzipped)
   - Status: Ready for production

✅ Backend (Node.js)
   - Compiled: dist/server/node-build.mjs
   - Size: 14 kB
   - Status: Ready for production

✅ TypeScript
   - All types valid
   - No compilation errors
   - No runtime warnings
```

## Pre-Deployment Checklist

### Environment Setup
- [ ] Create production `.env` file
- [ ] Set `GROQ_API_KEY` from https://console.groq.com
- [ ] Set `NODE_ENV=production`
- [ ] Set `MONGODB_URI` (MongoDB Atlas or self-hosted)
- [ ] Verify all env variables are set

### Security Review
- [ ] No hardcoded secrets in code ✅
- [ ] API keys in environment variables only ✅
- [ ] CORS whitelist configured for your domain
- [ ] HTTPS enabled
- [ ] WebSocket uses WSS (secure)
- [ ] Database password protected
- [ ] No debug logging in production

### Database Setup
- [ ] MongoDB instance ready
  - [ ] Local: `mongod` running
  - [ ] Cloud: MongoDB Atlas connection string configured
- [ ] Database authenticated
- [ ] Collections created (auto-created on first use)
- [ ] Backup strategy defined
- [ ] Connection string set in `.env`

### API Keys & Services
- [ ] Groq API key obtained and verified
- [ ] API key tested (rate limits: 30 req/min free tier)
- [ ] Alternative fallback plan if API unavailable

### Frontend Deployment
- [ ] Build verified: `pnpm build`
- [ ] No broken links
- [ ] Assets optimized
- [ ] Service worker configured (optional)
- [ ] Favicon and metadata set
- [ ] 404 page works
- [ ] Analytics configured (optional)

### Backend Deployment
- [ ] Build verified: `pnpm build`
- [ ] All routes tested
- [ ] WebSocket tested
- [ ] Database connection tested
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Logging configured
- [ ] Rate limiting configured (optional)

### Python Audio Service
- [ ] Service installed in production environment
- [ ] Requirements installed: `pip install -r python/requirements.txt`
- [ ] API key configured
- [ ] Audio device tested
- [ ] Network connectivity verified
- [ ] Running as background service/container

### Monitoring & Logging
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring set up
- [ ] Log aggregation configured
- [ ] Alerts configured for failures
- [ ] Health check endpoint ready

### Performance
- [ ] Page load time < 3s
- [ ] API response time < 1s
- [ ] WebSocket latency < 200ms
- [ ] Database query optimization verified
- [ ] CDN configured for static assets (optional)
- [ ] Image compression enabled

### Testing
- [ ] Manual testing in production environment
- [ ] Cross-browser testing
- [ ] Mobile responsiveness verified
- [ ] Network latency simulated
- [ ] Error scenarios tested
- [ ] Rate limiting tested

### Documentation
- [ ] README updated with deployment info
- [ ] Environment variables documented
- [ ] API documentation complete
- [ ] Troubleshooting guide available
- [ ] Runbook for common issues created

## Deployment Steps

### Option 1: Netlify + Vercel (Recommended for MVP)

#### Frontend (Netlify)

1. **Build:**
   ```bash
   pnpm build
   ```

2. **Deploy:**
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod --dir dist/spa
   ```

3. **Verify:**
   - Check https://your-domain.netlify.app
   - Verify all routes work
   - Test WebSocket connection

#### Backend (Vercel)

1. **Create `vercel.json`:**
   ```json
   {
     "buildCommand": "pnpm build",
     "outputDirectory": "dist/server",
     "env": {
       "GROQ_API_KEY": "@groq_api_key",
       "MONGODB_URI": "@mongodb_uri",
       "NODE_ENV": "production"
     }
   }
   ```

2. **Deploy:**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

3. **Set Environment Variables:**
   ```bash
   vercel env add GROQ_API_KEY
   vercel env add MONGODB_URI
   ```

4. **Verify:**
   - Check https://your-backend.vercel.app/api/ping
   - Monitor logs
   - Test WebSocket connection

### Option 2: Docker (Self-Hosted)

1. **Create `Dockerfile`:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN pnpm install --prod
   RUN pnpm build
   EXPOSE 8080
   CMD ["node", "dist/server/node-build.mjs"]
   ```

2. **Build Image:**
   ```bash
   docker build -t meeting-assistant:latest .
   ```

3. **Run Container:**
   ```bash
   docker run -e GROQ_API_KEY=... \
     -e MONGODB_URI=... \
     -e NODE_ENV=production \
     -p 8080:8080 \
     meeting-assistant:latest
   ```

### Option 3: Traditional Server (Linux)

1. **SSH into server:**
   ```bash
   ssh user@your-server.com
   ```

2. **Setup Node.js:**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   ```

3. **Clone repository:**
   ```bash
   git clone <repo> && cd meeting-assistant
   pnpm install
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

5. **Build:**
   ```bash
   pnpm build
   ```

6. **Run with PM2:**
   ```bash
   npm i -g pm2
   pm2 start dist/server/node-build.mjs --name "meeting-assistant"
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx:**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     
     location / {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
     }
   }
   ```

8. **Setup SSL:**
   ```bash
   apt-get install certbot
   certbot certonly --nginx -d your-domain.com
   ```

## Post-Deployment Verification

### Functional Tests

```bash
# Health check
curl https://your-domain.com/api/ping

# Create meeting
curl -X POST https://your-domain.com/api/meetings \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","userId":"test"}'

# Get meeting
curl https://your-domain.com/api/meetings/<ID>

# Test WebSocket
wscat -c wss://your-domain.com
# Then: {"type":"join-meeting","meetingId":"<ID>"}
```

### Performance Tests

```bash
# Frontend performance
lighthouse https://your-domain.com/meeting

# Backend load test
ab -n 100 -c 10 https://your-domain.com/api/ping

# WebSocket load test
artillery run websocket-test.yml
```

### Security Tests

- [ ] HTTPS enforced
- [ ] No exposed API keys
- [ ] CORS working correctly
- [ ] Rate limiting working
- [ ] SQL injection protected
- [ ] XSS protection enabled
- [ ] CSRF tokens validated

## Monitoring Setup

### Sentry (Error Tracking)

```javascript
// In backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### New Relic / DataDog (APM)

```javascript
// In backend
const newrelic = require('newrelic');

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});
```

### Logs

```bash
# View production logs
pm2 logs meeting-assistant

# Or with Docker
docker logs <container-id>

# Or with cloud provider
vercel logs
# netlify logs
```

## Rollback Plan

If something goes wrong:

1. **Immediate Rollback:**
   ```bash
   # Netlify
   netlify deploy --prod --dir dist/spa # of previous commit
   
   # Vercel
   vercel rollback
   
   # Docker
   docker run -t <previous-tag> ...
   ```

2. **Database Rollback:**
   ```bash
   # Restore from backup
   mongorestore --uri="mongodb://..." <backup-path>
   ```

3. **Communication:**
   - Notify users of incident
   - Post status update
   - Document what went wrong

## Maintenance

### Regular Tasks

- [ ] Daily: Monitor logs and errors
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Annually: Disaster recovery drill

### Backup Strategy

```bash
# Daily MongoDB backup
0 2 * * * mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# S3 upload
aws s3 sync /backups s3://your-backup-bucket/

# Retention: 30 days
```

### Updates

```bash
# Check for vulnerabilities
npm audit

# Update packages safely
npm update
pnpm update

# Test thoroughly
pnpm typecheck
pnpm test
pnpm build

# Deploy
git push  # CI/CD takes over
```

## Cost Estimation (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Netlify | $0 | Free tier |
| Vercel | $0-20 | Scales with usage |
| MongoDB Atlas | $10 | Free tier: 512MB |
| Groq API | $0-10 | Free: ~30 req/min |
| Domain | $12 | GoDaddy, Namecheap, etc |
| **Total** | **$22-52** | Very economical |

## Success Criteria

### Performance
- ✅ Page load: < 3 seconds
- ✅ API response: < 1 second
- ✅ WebSocket latency: < 200ms
- ✅ Uptime: > 99.5%

### Reliability
- ✅ Error rate: < 0.1%
- ✅ Zero data loss
- ✅ Automatic recovery
- ✅ Graceful degradation

### Security
- ✅ HTTPS everywhere
- ✅ No exposed secrets
- ✅ Rate limiting active
- ✅ Logs monitored

### User Experience
- ✅ No 404s on home routes
- ✅ Mobile responsive
- ✅ Real-time updates work
- ✅ Error messages helpful

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs meeting-assistant

# Verify environment variables
env | grep GROQ_API_KEY

# Check port availability
lsof -i :8080

# Restart
pm2 restart meeting-assistant
```

### WebSocket Not Connecting

```bash
# Check CORS
curl -H "Origin: http://localhost" -v https://your-domain.com

# Test WebSocket directly
wscat -c wss://your-domain.com

# Check Nginx config
nginx -t
systemctl restart nginx
```

### Database Connection Failed

```bash
# Test connection
mongosh "mongodb://..."

# Check credentials
echo $MONGODB_URI

# Verify network access
nc -zv your-mongodb-host 27017
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart with more memory
pm2 delete meeting-assistant
pm2 start dist/server/node-build.mjs --max-memory-restart 500M
```

## Support

For issues:
1. Check logs
2. Review troubleshooting section
3. Check relevant documentation
4. Contact support

---

**Deployment Checklist Complete!** ✅

Once all items are checked, your AI Meeting Assistant is production-ready.
