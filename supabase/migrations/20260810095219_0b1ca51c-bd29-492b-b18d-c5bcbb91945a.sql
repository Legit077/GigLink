-- One artist profile per user
ALTER TABLE public.artists ADD CONSTRAINT artists_user_id_unique UNIQUE (user_id);

-- One application per artist per gig
ALTER TABLE public.gig_applications ADD CONSTRAINT gig_applications_artist_gig_unique UNIQUE (gig_id, artist_id);

-- Only one accepted application per gig
CREATE UNIQUE INDEX idx_gig_applications_one_accepted_per_gig 
ON public.gig_applications (gig_id) 
WHERE status = 'accepted';

-- Prevent double-booking an artist on the same date (pending or accepted)
CREATE UNIQUE INDEX idx_bookings_artist_date_confirmed 
ON public.bookings (artist_id, event_date) 
WHERE status IN ('accepted', 'pending');

-- Atomic function to accept a gig application safely
CREATE OR REPLACE FUNCTION public.accept_gig_application(app_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gig_id uuid;
  _artist_id uuid;
  _organizer_id uuid;
  _venue_id uuid;
  _event_date date;
  _start_time time without time zone;
  _expected_guests integer;
  _proposed_fee numeric;
  _payment numeric;
  _title text;
  _gig_status public.gig_status;
  _booking_id uuid;
BEGIN
  -- Lock the gig row and fetch application details
  SELECT 
    ga.gig_id, ga.artist_id, g.organizer_id, g.venue_id, g.event_date, g.start_time,
    g.expected_attendance, ga.proposed_fee, g.payment, g.title, g.status
  INTO 
    _gig_id, _artist_id, _organizer_id, _venue_id, _event_date, _start_time,
    _expected_guests, _proposed_fee, _payment, _title, _gig_status
  FROM public.gig_applications ga
  JOIN public.gigs g ON g.id = ga.gig_id
  WHERE ga.id = app_id
  FOR UPDATE OF g;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Authorization: only the gig organizer or an admin can accept
  IF _organizer_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to accept this application';
  END IF;

  -- Race check: gig must still be open
  IF _gig_status != 'open' THEN
    RAISE EXCEPTION 'Gig is no longer accepting applications';
  END IF;

  -- Prevent double-booking the artist on the same date
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE artist_id = _artist_id
      AND event_date = _event_date
      AND status IN ('accepted', 'pending')
  ) THEN
    RAISE EXCEPTION 'Artist already has a booking on this date';
  END IF;

  -- Accept this application
  UPDATE public.gig_applications
  SET status = 'accepted'
  WHERE id = app_id;

  -- Reject remaining pending applications for this gig
  UPDATE public.gig_applications
  SET status = 'rejected'
  WHERE gig_id = _gig_id AND id != app_id AND status = 'pending';

  -- Create confirmed booking from the gig
  INSERT INTO public.bookings (
    artist_id, organizer_id, venue_id, event_date, start_time,
    expected_guests, budget, message, status
  ) VALUES (
    _artist_id, _organizer_id, _venue_id, _event_date, _start_time,
    _expected_guests, COALESCE(_proposed_fee, _payment),
    'Confirmed from gig board: ' || COALESCE(_title, ''), 'accepted'
  ) RETURNING id INTO _booking_id;

  -- Mark gig as filled
  UPDATE public.gigs
  SET status = 'filled'
  WHERE id = _gig_id;

  RETURN _booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_gig_application(uuid) TO authenticated;