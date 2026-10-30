# Public trust certificates

The Apple certificates verify App Store signed transactions. These files contain public certificates, never signing keys.

`SupabaseRootCA-2021.crt` is the public database CA downloaded over HTTPS from the certificate URL used by the official Supabase Studio:

- https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json

The PostgreSQL adapter uses this CA with certificate and hostname verification enabled. Replace it only from the official source when Supabase rotates its database CA.
