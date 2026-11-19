alter table public.artists add column if not exists city text not null default 'Kathmandu';
alter table public.venues add column if not exists city text not null default 'Kathmandu';

create index if not exists artists_city_idx on public.artists(city);
create index if not exists venues_city_idx on public.venues(city);

update public.artists set city = coalesce(nullif(trim(split_part(location, ',', greatest(1, array_length(string_to_array(location, ','), 1)))), ''), 'Kathmandu');
update public.venues set city = coalesce(nullif(trim(split_part(address, ',', greatest(1, array_length(string_to_array(address, ','), 1)))), ''), 'Kathmandu');

insert into public.venues (id, name, venue_type, address, city, max_capacity, description) values
 ('11111111-1111-4111-8111-000000000004','Lakeside Amphitheatre','event_space','Lakeside Road, Pokhara','Pokhara',600,'Open-air stage looking over Phewa Lake.'),
 ('11111111-1111-4111-8111-000000000005','Busy Bee Cafe','restaurant','Lakeside, Pokhara','Pokhara',150,'Long-running live music cafe and bar.'),
 ('11111111-1111-4111-8111-000000000006','Riverside Jungle Lodge','venue','Sauraha, Chitwan','Chitwan',250,'Riverside lawn stage for folk and fusion nights.'),
 ('11111111-1111-4111-8111-000000000007','Dharan Club House','venue','Bhanuchowk, Dharan','Dharan',300,'Community hall hosting weekend concerts.'),
 ('11111111-1111-4111-8111-000000000008','Biratnagar Cultural Hall','event_space','Main Road, Biratnagar','Biratnagar',500,'Large indoor hall for festivals and ceremonies.'),
 ('11111111-1111-4111-8111-000000000009','Butwal Rooftop Lounge','restaurant','Traffic Chowk, Butwal','Butwal',120,'Rooftop lounge with an acoustic stage.')
on conflict (id) do nothing;

insert into public.artists (id, name, artist_type, genres, bio, location, city, hourly_rate, members_count, contact_phone) values
 ('22222222-2222-4222-8222-000000000005','Phewa Tides','band','{"Indie","Rock"}','Lakeside indie rock four-piece with an original set.','Lakeside, Pokhara','Pokhara',11000,4,'+977-9800000005'),
 ('22222222-2222-4222-8222-000000000006','Anisha Gurung','solo','{"Acoustic","Folk"}','Acoustic vocalist touring cafes and lodges.','Pokhara','Pokhara',5000,1,'+977-9800000006'),
 ('22222222-2222-4222-8222-000000000007','Terai Groove Collective','band','{"Funk","Fusion"}','Seven-piece funk and fusion outfit from the eastern Terai.','Biratnagar','Biratnagar',14000,7,'+977-9800000007'),
 ('22222222-2222-4222-8222-000000000008','Dharan Street Beat','band','{"Hip-Hop","Rap"}','Live hip-hop crew with a full band backing.','Dharan','Dharan',9500,5,'+977-9800000008'),
 ('22222222-2222-4222-8222-000000000009','Bardan Sings','solo','{"Pop","Nepali"}','Nepali pop covers and originals, ideal for lounges.','Butwal','Butwal',4000,1,'+977-9800000009'),
 ('22222222-2222-4222-8222-000000000010','Rapti Roots','band','{"Folk","World"}','Traditional Tharu-inspired folk ensemble.','Sauraha, Chitwan','Chitwan',10000,5,'+977-9800000010')
on conflict (id) do nothing;

insert into public.gigs (id, venue_id, title, description, event_start, event_end, expected_attendance, budget, genres, status) values
 ('33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000004','Lakeside Sunset Concert','Headline slot as the sun sets over Phewa Lake.', now() + interval '9 days' + interval '17 hours', now() + interval '9 days' + interval '20 hours', 550, 55000, '{"Indie","Rock"}','open'),
 ('33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000006','Jungle Lodge Folk Night','Acoustic folk set for lodge guests.', now() + interval '12 days' + interval '18 hours', now() + interval '12 days' + interval '21 hours', 200, 25000, '{"Folk","World"}','open'),
 ('33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000008','Biratnagar Winter Festival','Two-hour festival slot on the main stage.', now() + interval '18 days' + interval '18 hours', now() + interval '18 days' + interval '20 hours', 480, 50000, '{"Funk","Fusion"}','open'),
 ('33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000009','Rooftop Acoustic Evening','Relaxed acoustic set for a rooftop crowd.', now() + interval '6 days' + interval '18 hours', now() + interval '6 days' + interval '21 hours', 110, 12000, '{"Pop","Acoustic"}','open')
on conflict (id) do nothing;