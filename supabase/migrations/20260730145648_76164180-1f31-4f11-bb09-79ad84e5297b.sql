CREATE TYPE public.gig_status AS ENUM ('open','closed','filled');
CREATE TYPE public.application_status AS ENUM ('pending','accepted','rejected','withdrawn');

CREATE TABLE public.gigs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  duration_hours NUMERIC(4,1) NOT NULL DEFAULT 2,
  payment NUMERIC(10,2),
  genres TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  location TEXT,
  expected_attendance INTEGER NOT NULL DEFAULT 0,
  venue_capacity INTEGER NOT NULL DEFAULT 0,
  status public.gig_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gigs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open gigs are viewable by everyone" ON public.gigs
  FOR SELECT USING (status = 'open' OR organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Organizers create their own gigs" ON public.gigs
  FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid() AND public.has_role(auth.uid(),'organizer'));
CREATE POLICY "Organizers update their own gigs" ON public.gigs
  FOR UPDATE TO authenticated USING (organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Organizers delete their own gigs" ON public.gigs
  FOR DELETE TO authenticated USING (organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gig_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  message TEXT,
  proposed_fee NUMERIC(10,2),
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, artist_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gig_applications TO authenticated;
GRANT ALL ON public.gig_applications TO service_role;
ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists and gig owners can view applications" ON public.gig_applications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.organizer_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "Artists apply to open gigs" ON public.gig_applications
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.status = 'open')
  );
CREATE POLICY "Artists and gig owners update applications" ON public.gig_applications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.organizer_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.organizer_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "Artists withdraw their applications" ON public.gig_applications
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER update_gig_applications_updated_at BEFORE UPDATE ON public.gig_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gigs_status_date ON public.gigs (status, event_date);
CREATE INDEX idx_gig_applications_gig ON public.gig_applications (gig_id);
CREATE INDEX idx_gig_applications_artist ON public.gig_applications (artist_id);