-- Verification documents can also be Word files or GIFs (all open in the
-- in-app document viewer).
update storage.buckets
   set allowed_mime_types = array[
     'application/pdf',
     'image/jpeg', 'image/png', 'image/webp', 'image/gif',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ]
 where id = 'tutor-documents';
