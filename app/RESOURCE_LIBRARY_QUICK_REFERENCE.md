# Resource Library - Quick Reference Guide

## Feature Overview

Coaches upload educational resources (PDF, images, audio) that clients can securely download with presigned URLs.

## Routes

- **Coach:** `http://localhost:3000/coach/resources`
- **Client:** `http://localhost:3000/client/resources`

## Navigation

Both appear in the sidebar under "Resources" link (auto-hidden based on user role)

---

## Backend Operations

### Upload Resources

```typescript
// Get presigned S3 URL
const { uploadUrl, s3Key, uploadFields } = await getUploadUrl({
  fileName: "document.pdf",
  fileType: "application/pdf",
});

// Upload to S3 via browser
await uploadFileWithProgress({
  file: fileObject,
  s3UploadUrl: uploadUrl,
  s3UploadFields: uploadFields,
  setUploadProgressPercent: setProgress,
});

// Save to database
const resource = await createResource({
  name: "Important Document",
  type: "application/pdf",
  s3Key: s3Key,
  description: "Optional description",
});
```

### Fetch Resources

```typescript
// Works for both coaches (own) and clients (coach's)
const resources = await getCoachResources();
```

### Download Resources

```typescript
const presignedUrl = await getResourceDownloadUrl({
  resourceId: "resource-uuid",
});
window.open(presignedUrl, "_blank"); // Triggers download
```

### Delete Resources

```typescript
// Coaches only
const deleted = await deleteResource({
  resourceId: "resource-uuid",
});
```

---

## Allowed File Types

| Type      | MIME Type         | Extension   |
| --------- | ----------------- | ----------- |
| PDF       | `application/pdf` | .pdf        |
| JPEG      | `image/jpeg`      | .jpg, .jpeg |
| PNG       | `image/png`       | .png        |
| MP3       | `audio/mpeg`      | .mp3        |
| M4A       | `audio/mp4`       | .m4a        |
| M4A (alt) | `audio/x-m4a`     | .m4a        |

**Max Size:** 20MB per file

---

## Component Props

### CoachResourcesPage

```typescript
export default function CoachResourcesPage({ user }: { user: User });
```

- Requires authenticated coach user
- Auto-hides delete/upload for non-coaches

### ClientResourcesPage

```typescript
export default function ClientResourcesPage({ user }: { user: User });
```

- Requires authenticated client user
- Read-only resource viewing with download button

---

## Error Codes

| Code | Meaning                     | Fix                         |
| ---- | --------------------------- | --------------------------- |
| 401  | Not authenticated           | Log in first                |
| 403  | Not authorized (wrong role) | Coach/Client role required  |
| 404  | Resource not found          | Resource may be deleted     |
| 500  | Server error                | Check S3 bucket credentials |

---

## Common Tasks

### As a Coach: Upload a Resource

1. Navigate to `/coach/resources`
2. Enter resource name
3. (Optional) Add description
4. Select file (PDF/JPG/PNG/MP3/M4A)
5. Click "Upload Resource"
6. Watch progress 0→100%
7. Resource appears in list

### As a Coach: Delete a Resource

1. Find resource in list
2. Click trash icon
3. Confirm in dialog
4. Resource deleted from S3 and database

### As a Client: Download a Resource

1. Navigate to `/client/resources`
2. See resources from assigned coach
3. Click "Download" on resource
4. File downloads to computer

---

## AWS S3 Setup (Required)

### 1. Create IAM User

```bash
# In AWS Console:
1. Go to IAM → Users → Create User
2. Set username (e.g., "loom-app")
3. Create access key
4. Copy Access Key ID and Secret Access Key
```

### 2. Create S3 Bucket

```bash
# In AWS Console:
1. S3 → Create Bucket
2. Name: "loom-resources" (or your choice)
3. Region: "us-east-1" (or your region)
4. Block all public access (checked)
5. Create bucket
```

### 3. Attach S3 Policy to IAM User

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::loom-resources/*"
    }
  ]
}
```

### 4. Configure CORS on Bucket

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "POST", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 5. Update Environment Variables

```bash
# In .env.server:
AWS_S3_IAM_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_S3_IAM_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_FILES_BUCKET=loom-resources
AWS_S3_REGION=us-east-1
```

### 6. Restart Application

```bash
pkill -f "wasp start"
wasp start
```

---

## Troubleshooting

### "File not found in S3"

- Verify bucket name in `.env.server`
- Check IAM user has S3 access
- Ensure file uploaded successfully (check progress to 100%)

### "CORS error" on upload

- Configure CORS on S3 bucket
- Restart application after CORS update
- Check your domain is in CORS allowed origins

### Upload stuck at 0%

- Check browser console for errors
- Verify S3 bucket CORS is configured
- Try with smaller file first

### Download URL expired

- Presigned URLs valid for 1 hour
- User must click download within 1 hour
- Re-click download button to get fresh URL

---

## File Structure

```
src/
├── resources/
│   ├── operations.ts        # 5 backend operations
│   └── validation.ts        # File type & size validation
├── coach/
│   └── ResourcesPage.tsx    # Coach upload/manage UI
├── client/
│   └── ResourcesPage.tsx    # Client view/download UI
└── file-upload/
    ├── s3Utils.ts           # S3 client utilities
    └── fileUploading.ts     # Client-side upload with progress

main.wasp                       # Routes & operations definitions
schema.prisma                   # Resource model
```

---

## Performance Notes

- Upload progress updates in real-time (xhr progress events)
- Presigned URLs prevent exposing AWS credentials
- Files stored in S3 (cheaper than database)
- Cascade delete when coach is deleted
- Resource queries ordered by `createdAt desc`

---

## Security Features

✅ Role-based access control (Coach/Client)
✅ Resource ownership verification
✅ File type and size validation
✅ Presigned URLs (no credential exposure)
✅ HTTP auth required on all operations
✅ S3 key verified before DB insert
✅ Atomic transactions (fail-safe deletes)

---

## Monitoring & Logging

Check server logs for:

```
POST /operations/get-coach-resources [200] ← Success
POST /operations/createResource [200]      ← Resource created
POST /operations/deleteResource [200]      ← Resource deleted
Error: "File not found in S3"              ← Upload failed
```

---

## Billing Considerations (AWS)

- **Storage:** ~$0.023 per GB/month
- **Requests:** ~$0.0004 per 10k GET requests
- **Data Transfer:** First 1GB/month free, then $0.09/GB
- **Presigned URLs:** No cost (generates on-demand)

For 10,000 users downloading 10MB resources monthly:

- Storage: ~$2.30/month
- Requests: ~$0.04/month
- Transfer: ~$10/month
- **Total: ~$12/month**

---

## Future Enhancements

- [ ] Category/tag organization
- [ ] Search and filtering
- [ ] Bulk upload
- [ ] Resource preview (PDF/images)
- [ ] Download usage tracking
- [ ] Session attachment
- [ ] External URL support (YouTube, Google Drive)

---

**Last Updated:** November 26, 2025
**Status:** Production Ready
**Tested:** ✅ Compilation ✅ Server Running ✅ Operations Responding
