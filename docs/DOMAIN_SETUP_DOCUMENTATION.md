# Domain Setup Documentation

**Date**: October 21, 2025
**Domain**: bookbridge.app
**Registrar**: Namecheap
**Cost**: $7.18/year
**Hosting**: Render (bookbridge-mkd7.onrender.com)

## 🌐 Domain Configuration

### Purchase Details
- **Domain**: bookbridge.app
- **Registrar**: Namecheap
- **Price**: $7.18/year
- **Privacy Protection**: WhoisGuard enabled (personal info hidden from WHOIS)

### DNS Configuration (Namecheap Advanced DNS)
| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | bookbridge-mkd7.onrender.com | Automatic |
| CNAME | www | bookbridge-mkd7.onrender.com | Automatic |

### Render Configuration
1. **Settings → Custom Domains**
2. **Added Domains**:
   - bookbridge.app ✅ Verified
   - www.bookbridge.app ✅ Verified
3. **SSL Certificate**: Auto-provisioned by Render ✅

## 🔗 Access URLs

### Primary (Production)
- **https://bookbridge.app** - Main custom domain
- **https://www.bookbridge.app** - www subdomain (redirects to main)

### Legacy
- **https://bookbridge-mkd7.onrender.com** - Original Render URL (can be disabled later)

## 🔒 Security

- **SSL/TLS**: Automatic via Render (Let's Encrypt)
- **Domain Privacy**: WhoisGuard protection active
- **HTTPS**: Enforced on all URLs

## 📅 Maintenance

### Annual Tasks
- **Domain Renewal**: Yearly renewal with Namecheap (~$7.18)
- **SSL Certificate**: Auto-renews via Render (no action needed)

### If DNS Changes Needed
1. Login to Namecheap → Domain List → Manage
2. Advanced DNS → Update records
3. Wait 24-48 hours for propagation

### If Moving Hosts
1. Update CNAME records to point to new host
2. Add custom domain in new hosting platform
3. Wait for SSL provisioning

## 🚨 Important Notes

1. **Never delete CNAME records** without having new ones ready
2. **Keep WhoisGuard active** for privacy protection
3. **Render subdomain** (bookbridge-mkd7.onrender.com) can be disabled after ensuring custom domain works for all users
4. **Domain auto-renew** recommended to prevent expiration

## 📊 Verification Commands

```bash
# Check DNS propagation
nslookup bookbridge.app

# Verify SSL certificate
openssl s_client -connect bookbridge.app:443 -servername bookbridge.app

# Test redirect
curl -I https://www.bookbridge.app
```

## 📝 Change Log

| Date | Change | By |
|------|--------|-----|
| Oct 21, 2025 | Initial domain setup and DNS configuration | Admin |