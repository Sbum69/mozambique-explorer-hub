CREATE POLICY "Customers can read activities in their booking history" ON public.experiences FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.bookings b WHERE b.experience_id=experiences.id AND b.customer_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  NEW.status:='pending'; NEW.verified:=false; NEW.rejection_reason:=NULL; NEW.decided_at:=NULL; NEW.decided_by:=NULL; RETURN NEW;
 END IF;
 NEW.id:=OLD.id; NEW.owner_id:=OLD.owner_id; NEW.slug:=OLD.slug; NEW.type:=OLD.type; NEW.created_at:=OLD.created_at;
 NEW.status:=OLD.status; NEW.verified:=OLD.verified; NEW.rejection_reason:=OLD.rejection_reason; NEW.decided_at:=OLD.decided_at; NEW.decided_by:=OLD.decided_by;
 NEW.updated_at:=now(); RETURN NEW;
END $$;