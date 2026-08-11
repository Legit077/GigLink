DROP POLICY "Open gigs are viewable by everyone" ON public.gigs;

CREATE POLICY "Open gigs are viewable by everyone" ON public.gigs
  FOR SELECT USING (status = 'open' OR organizer_id = auth.uid());

CREATE POLICY "Admins can view all gigs" ON public.gigs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));