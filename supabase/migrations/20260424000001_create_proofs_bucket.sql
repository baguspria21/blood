-- Create "proofs" bucket
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

-- Allow public read access to the proofs bucket
create policy "Public Access to proofs"
on storage.objects for select
to public
using ( bucket_id = 'proofs' );

-- Allow authenticated users to upload to the proofs bucket (if needed)
create policy "Authenticated users can upload proofs"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'proofs' );
