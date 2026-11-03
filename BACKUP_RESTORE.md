# BACKUP_RESTORE.md – UniverseByte CRM Database Disaster Recovery

> **Project:** UniverseByte CRM  
> **Brand:** UniverseByte – Technology Redefined  
> **Target Database:** MongoDB Atlas Replica Set  

---

## 1. Disaster Recovery Objectives

- **Recovery Point Objective (RPO):** < 1 hour (Continuous Snapshots in Atlas).
- **Recovery Time Objective (RTO):** < 30 minutes (Automated Point-in-Time Restore).

---

## 2. Automated Backups via MongoDB Atlas

MongoDB Atlas provides built-in, fully automated cloud backups.

### 2.1 Enabling Continuous Cloud Backups
1. In the [MongoDB Atlas Console](https://cloud.mongodb.com), navigate to your Cluster.
2. Open the **Backup** tab.
3. Verify that **Continuous Cloud Backups** is enabled:
   - Snapshot frequency: Every 6 hours.
   - Snapshot retention: 7 days.
   - Point-in-Time Recovery (PITR): Enabled (allows second-by-second rollbacks up to 7 days).

### 2.2 Performing a Point-in-Time Restore (Atlas GUI)
1. Go to **Backup** → **Restore**.
2. Select **Point in Time**.
3. Choose the exact date and timestamp prior to the corruption or accidental data deletion.
4. Select target:
   - **Restore to New Cluster:** Recommended for safe data inspection without downtime.
   - **Restore to Existing Cluster:** Directly replaces existing data.

---

## 3. Manual Backup Procedure (`mongodump`)

For local archival, pre-migration snapshots, or compliance storage, create compressed binary dumps.

### 3.1 Full Database Backup
Run from a machine with network access to MongoDB Atlas:

```bash
# Set connection URI
export MONGODB_URI="mongodb+srv://ub_crm_app:<password>@cluster0.xxxxx.mongodb.net/universebyte_crm?retryWrites=true&w=majority"
export BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"

# Run mongodump with gzip compression
mongodump --uri="$MONGODB_URI" --gzip --out="$BACKUP_DIR"

echo "Backup created at: $BACKUP_DIR"
```

### 3.2 Single Collection Backup (e.g. Leads)
```bash
mongodump --uri="$MONGODB_URI" --collection="leads" --gzip --out="./backups/leads_$(date +%Y%m%d)"
```

---

## 4. Manual Restore Procedure (`mongorestore`)

### 4.1 Restoring Full Database
To restore a backup into a database:

```bash
export MONGODB_URI="mongodb+srv://ub_crm_app:<password>@cluster0.xxxxx.mongodb.net/universebyte_crm?retryWrites=true&w=majority"

# Restore from compressed archive
mongorestore --uri="$MONGODB_URI" --gzip --dir="./backups/2026-11-03_14-00-00/universebyte_crm" --nsInclude="universebyte_crm.*"
```

> [!CAUTION]
> Using the `--drop` flag will drop existing collections before restoring. Only use `--drop` during full disaster recovery when existing corrupted data must be replaced.

### 4.2 Restoring a Specific Collection (e.g. Leads)
```bash
mongorestore --uri="$MONGODB_URI" --gzip --nsInclude="universebyte_crm.leads" ./backups/leads_20261103/universebyte_crm/leads.bson.gz
```

---

## 5. CSV Data Export & Compliance Archival

For auditing, data transfer, or offline spreadsheets:

1. **Via CRM Web Interface:**
   - Go to **Leads Pipeline** or **Reports & Analytics**.
   - Select date filters.
   - Click **Export CSV** to download RFC-compliant streaming CSV files.
2. **Via Backend API:**
   ```bash
   curl -H "Authorization: Bearer <token>" "https://api.universebyte.com/api/v1/leads/export/csv" -o leads_export.csv
   ```

---

## 6. Incident Response & Rollback Playbook

In the event of a catastrophic operational failure or unintended data loss:

1. **Isolate:** If malicious activity is suspected, temporarily pause public traffic by disabling the Render service or setting `NODE_ENV=maintenance`.
2. **Assess:** Check Render application logs and MongoDB Atlas metrics to identify the timestamp and scope of the failure.
3. **Restore:**
   - Open MongoDB Atlas → **Backup** → **Restore**.
   - Perform a Point-in-Time restore to a snapshot 5 minutes prior to the event.
4. **Validate:**
   - Run the automated production smoke test:
     ```bash
     npm run smoke:test
     ```
5. **Resume:** Reactivate Render web services and notify administrators.

