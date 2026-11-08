export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      admin_broadcasts: {
        Row: {
          audience: string
          body_en: string
          body_pt: string
          created_at: string
          id: string
          link: string | null
          recipients: number
          sent_by: string | null
          target_user: string | null
          title_en: string
          title_pt: string
        }
        Insert: {
          audience: string
          body_en: string
          body_pt: string
          created_at?: string
          id?: string
          link?: string | null
          recipients?: number
          sent_by?: string | null
          target_user?: string | null
          title_en: string
          title_pt: string
        }
        Update: {
          audience?: string
          body_en?: string
          body_pt?: string
          created_at?: string
          id?: string
          link?: string | null
          recipients?: number
          sent_by?: string | null
          target_user?: string | null
          title_en?: string
          title_pt?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcasts_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcasts_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_errors: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          release: string | null
          route: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          release?: string | null
          route: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          release?: string | null
          route?: string
        }
        Relationships: []
      }
      assistant_faq_entries: {
        Row: {
          active: boolean
          answer_en: string
          answer_pt: string
          created_at: string
          id: string
          keywords_en: string[]
          keywords_pt: string[]
          kind: string
          links: Json
          needs_validation: boolean
          question_en: string
          question_pt: string
          slug: string
          topic: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          active?: boolean
          answer_en: string
          answer_pt: string
          created_at?: string
          id?: string
          keywords_en?: string[]
          keywords_pt?: string[]
          kind?: string
          links?: Json
          needs_validation?: boolean
          question_en: string
          question_pt: string
          slug: string
          topic: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          answer_en?: string
          answer_pt?: string
          created_at?: string
          id?: string
          keywords_en?: string[]
          keywords_pt?: string[]
          kind?: string
          links?: Json
          needs_validation?: boolean
          question_en?: string
          question_pt?: string
          slug?: string
          topic?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      assistant_faq_versions: {
        Row: {
          created_at: string
          created_by: string | null
          entry_id: string
          id: string
          reason: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_id: string
          id?: string
          reason?: string | null
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_id?: string
          id?: string
          reason?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assistant_faq_versions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "assistant_faq_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_feedback: {
        Row: {
          created_at: string
          entry_slug: string
          helpful: boolean
          id: string
          lang: string
        }
        Insert: {
          created_at?: string
          entry_slug: string
          helpful: boolean
          id?: string
          lang: string
        }
        Update: {
          created_at?: string
          entry_slug?: string
          helpful?: boolean
          id?: string
          lang?: string
        }
        Relationships: []
      }
      assistant_llm_usage: {
        Row: {
          calls: number
          day: string
          neurons: number
          updated_at: string
        }
        Insert: {
          calls?: number
          day: string
          neurons?: number
          updated_at?: string
        }
        Update: {
          calls?: number
          day?: string
          neurons?: number
          updated_at?: string
        }
        Relationships: []
      }
      assistant_unanswered: {
        Row: {
          created_at: string
          handled: boolean
          id: string
          lang: string
          question: string
        }
        Insert: {
          created_at?: string
          handled?: boolean
          id?: string
          lang: string
          question: string
        }
        Update: {
          created_at?: string
          handled?: boolean
          id?: string
          lang?: string
          question?: string
        }
        Relationships: []
      }
      booking_commission_snapshots: {
        Row: {
          booking_id: string
          business_id: string
          commission_bp: number
          commission_cents: number
          config_version: number
          created_at: string
          founder: boolean
          gross_cents: number
          net_cents: number
          provider_fee_bp: number
          provider_fee_cents: number
        }
        Insert: {
          booking_id: string
          business_id: string
          commission_bp: number
          commission_cents: number
          config_version: number
          created_at?: string
          founder: boolean
          gross_cents: number
          net_cents: number
          provider_fee_bp: number
          provider_fee_cents: number
        }
        Update: {
          booking_id?: string
          business_id?: string
          commission_bp?: number
          commission_cents?: number
          config_version?: number
          created_at?: string
          founder?: boolean
          gross_cents?: number
          net_cents?: number
          provider_fee_bp?: number
          provider_fee_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_commission_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commission_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          business_id: string
          code: string
          created_at: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          date: string
          decision_reason: string | null
          experience_id: string
          id: string
          notes: string | null
          people: number
          status: Database["public"]["Enums"]["booking_status"]
          time: string
          total_mzn: number
          updated_at: string
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          customer_email?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          date: string
          decision_reason?: string | null
          experience_id: string
          id?: string
          notes?: string | null
          people: number
          status?: Database["public"]["Enums"]["booking_status"]
          time: string
          total_mzn?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          date?: string
          decision_reason?: string | null
          experience_id?: string
          id?: string
          notes?: string | null
          people?: number
          status?: Database["public"]["Enums"]["booking_status"]
          time?: string
          total_mzn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          active: boolean
          code: string
          created_at: string
          name_en: string
          name_pt: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          name_en: string
          name_pt: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          name_en?: string
          name_pt?: string
          sort_order?: number
        }
        Relationships: []
      }
      business_commercial_terms: {
        Row: {
          business_id: string
          founder_since: string | null
          founder_until: string | null
          free_highlights_used: number
          updated_at: string
        }
        Insert: {
          business_id: string
          founder_since?: string | null
          founder_until?: string | null
          free_highlights_used?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          founder_since?: string | null
          founder_until?: string | null
          free_highlights_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_commercial_terms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_invites: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_leads: {
        Row: {
          accepts_bookings: boolean
          admin_note: string | null
          business_id: string | null
          business_name: string
          category_code: string
          contact: string
          contact_name: string
          created_at: string
          id: string
          ip_day_hash: string
          lang: string
          message: string | null
          province_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepts_bookings: boolean
          admin_note?: string | null
          business_id?: string | null
          business_name: string
          category_code: string
          contact: string
          contact_name: string
          created_at?: string
          id?: string
          ip_day_hash: string
          lang?: string
          message?: string | null
          province_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepts_bookings?: boolean
          admin_note?: string | null
          business_id?: string | null
          business_name?: string
          category_code?: string
          contact?: string
          contact_name?: string
          created_at?: string
          id?: string
          ip_day_hash?: string
          lang?: string
          message?: string | null
          province_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_leads_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "business_leads_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category: string | null
          category_code: string | null
          contact: Json | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          images: string[] | null
          location: Json | null
          name: string
          owner_id: string | null
          province: string | null
          province_id: string | null
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          type: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          category?: string | null
          category_code?: string | null
          contact?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: Json | null
          name: string
          owner_id?: string | null
          province?: string | null
          province_id?: string | null
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["business_status"]
          type?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          category?: string | null
          category_code?: string | null
          contact?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: Json | null
          name?: string
          owner_id?: string | null
          province?: string | null
          province_id?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["business_status"]
          type?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "businesses_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_configs: {
        Row: {
          commission_bp: number
          created_at: string
          created_by: string | null
          founder_cap: number
          founder_commission_bp: number
          founder_free_highlights: number
          founder_months: number
          highlight_month_cents: number
          highlight_week_cents: number
          id: string
          note: string | null
          plan_month_cents: number
          provider_fee_bp: number
          sponsored_per_page: number
          sponsored_slots_per_scope: number
          version: number
        }
        Insert: {
          commission_bp: number
          created_at?: string
          created_by?: string | null
          founder_cap: number
          founder_commission_bp: number
          founder_free_highlights?: number
          founder_months: number
          highlight_month_cents: number
          highlight_week_cents: number
          id?: string
          note?: string | null
          plan_month_cents: number
          provider_fee_bp?: number
          sponsored_per_page?: number
          sponsored_slots_per_scope?: number
          version?: never
        }
        Update: {
          commission_bp?: number
          created_at?: string
          created_by?: string | null
          founder_cap?: number
          founder_commission_bp?: number
          founder_free_highlights?: number
          founder_months?: number
          highlight_month_cents?: number
          highlight_week_cents?: number
          id?: string
          note?: string | null
          plan_month_cents?: number
          provider_fee_bp?: number
          sponsored_per_page?: number
          sponsored_slots_per_scope?: number
          version?: never
        }
        Relationships: []
      }
      community_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name_en: string
          name_pt: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name_en: string
          name_pt: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name_en?: string
          name_pt?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      community_experiences: {
        Row: {
          active: boolean
          additional_info: string | null
          category: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description_en: string
          description_pt: string
          id: string
          image_path: string | null
          image_url: string | null
          lat: number | null
          lng: number | null
          location: string
          location_en: string | null
          province_id: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          title_en: string
          title_pt: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_info?: string | null
          category: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description_en: string
          description_pt: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          location_en?: string | null
          province_id: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          title_en: string
          title_pt: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_info?: string | null
          category?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description_en?: string
          description_pt?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          location_en?: string | null
          province_id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          title_en?: string
          title_pt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_experiences_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_experiences_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_experiences_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_experiences_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_experiences_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          destination_id: string | null
          experience_id: string | null
          id: string
          image_url: string | null
          province_id: string | null
          route_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          destination_id?: string | null
          experience_id?: string | null
          id?: string
          image_url?: string | null
          province_id?: string | null
          route_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          destination_id?: string | null
          experience_id?: string | null
          id?: string
          image_url?: string | null
          province_id?: string | null
          route_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "community_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_visits: {
        Row: {
          destination_id: string
          id: string
          user_id: string
          visited_at: string
        }
        Insert: {
          destination_id: string
          id?: string
          user_id: string
          visited_at?: string
        }
        Update: {
          destination_id?: string
          id?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_visits_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          badges: string[]
          category: string | null
          created_at: string
          description_en: string | null
          description_pt: string | null
          highlights: Json
          id: string
          images: string[] | null
          lat: number | null
          lng: number | null
          name: string
          province: string
          province_id: string | null
          region_en: string | null
          region_pt: string | null
          slug: string
          updated_at: string
          visitors_k: number
        }
        Insert: {
          badges?: string[]
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          highlights?: Json
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name: string
          province: string
          province_id?: string | null
          region_en?: string | null
          region_pt?: string | null
          slug: string
          updated_at?: string
          visitors_k?: number
        }
        Update: {
          badges?: string[]
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          highlights?: Json
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name?: string
          province?: string
          province_id?: string | null
          region_en?: string | null
          region_pt?: string | null
          slug?: string
          updated_at?: string
          visitors_k?: number
        }
        Relationships: [
          {
            foreignKeyName: "destinations_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participations: {
        Row: {
          created_at: string
          event_key: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_requests: {
        Row: {
          applied_at: string | null
          outcome: string | null
          request_id: number
          requested_at: string
        }
        Insert: {
          applied_at?: string | null
          outcome?: string | null
          request_id: number
          requested_at?: string
        }
        Update: {
          applied_at?: string | null
          outcome?: string | null
          request_id?: number
          requested_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency: string
          fetched_at: string
          per_usd: number
          rate_date: string
          source: string
        }
        Insert: {
          currency: string
          fetched_at?: string
          per_usd: number
          rate_date: string
          source: string
        }
        Update: {
          currency?: string
          fetched_at?: string
          per_usd?: number
          rate_date?: string
          source?: string
        }
        Relationships: []
      }
      experience_availability: {
        Row: {
          accepts_new_bookings: boolean
          active: boolean
          capacity: number
          created_at: string
          day_of_week: number
          end_time: string
          experience_id: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          accepts_new_bookings?: boolean
          active?: boolean
          capacity: number
          created_at?: string
          day_of_week: number
          end_time: string
          experience_id: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          accepts_new_bookings?: boolean
          active?: boolean
          capacity?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          experience_id?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_availability_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          active: boolean
          business_id: string
          capacity: number | null
          category: string | null
          created_at: string
          description_en: string | null
          description_pt: string | null
          destination_id: string | null
          duration_hours: number | null
          id: string
          images: string[] | null
          location: string | null
          price_mzn: number
          province: string | null
          rating: number | null
          reviews: number
          slug: string | null
          title_en: string | null
          title_pt: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          capacity?: number | null
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          location?: string | null
          price_mzn?: number
          province?: string | null
          rating?: number | null
          reviews?: number
          slug?: string | null
          title_en?: string | null
          title_pt: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          capacity?: number | null
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          location?: string | null
          price_mzn?: number
          province?: string | null
          rating?: number | null
          reviews?: number
          slug?: string | null
          title_en?: string | null
          title_pt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_catalog: {
        Row: {
          category: string
          key: string
          sort_order: number
          total: number
          unlock_after: string | null
          verification: string
          xp: number
        }
        Insert: {
          category: string
          key: string
          sort_order?: number
          total: number
          unlock_after?: string | null
          verification: string
          xp: number
        }
        Update: {
          category?: string
          key?: string
          sort_order?: number
          total?: number
          unlock_after?: string | null
          verification?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_catalog_unlock_after_fkey"
            columns: ["unlock_after"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      game_completions: {
        Row: {
          completed_at: string
          game_key: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          game_key: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          game_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_completions_game_key_fkey"
            columns: ["game_key"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "game_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_quiz_attempts: {
        Row: {
          answers: Json
          correct_count: number
          finished_at: string | null
          game_key: string
          id: string
          passed: boolean | null
          question_ids: string[]
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          correct_count?: number
          finished_at?: string | null
          game_key: string
          id?: string
          passed?: boolean | null
          question_ids: string[]
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          correct_count?: number
          finished_at?: string | null
          game_key?: string
          id?: string
          passed?: boolean | null
          question_ids?: string[]
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_quiz_attempts_game_key_fkey"
            columns: ["game_key"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "game_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_quiz_questions: {
        Row: {
          active: boolean
          correct_index: number
          explanation_pt: string
          id: string
          options_pt: string[]
          position: number
          question_pt: string
        }
        Insert: {
          active?: boolean
          correct_index: number
          explanation_pt: string
          id?: string
          options_pt: string[]
          position: number
          question_pt: string
        }
        Update: {
          active?: boolean
          correct_index?: number
          explanation_pt?: string
          id?: string
          options_pt?: string[]
          position?: number
          question_pt?: string
        }
        Relationships: []
      }
      game_steps: {
        Row: {
          created_at: string
          details: Json
          game_key: string
          id: string
          location_accuracy_m: number | null
          location_distance_m: number | null
          location_verified: boolean | null
          proof_path: string | null
          step_ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          game_key: string
          id?: string
          location_accuracy_m?: number | null
          location_distance_m?: number | null
          location_verified?: boolean | null
          proof_path?: string | null
          step_ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          game_key?: string
          id?: string
          location_accuracy_m?: number | null
          location_distance_m?: number | null
          location_verified?: boolean | null
          proof_path?: string | null
          step_ref?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_steps_game_key_fkey"
            columns: ["game_key"]
            isOneToOne: false
            referencedRelation: "game_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "game_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document: string
          id: string
          source: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          source: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          source?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      manual_payment_configs: {
        Row: {
          account_name: string
          created_at: string
          created_by: string | null
          id: string
          instructions_en: string
          instructions_pt: string
          mpesa_number: string
          version: number
        }
        Insert: {
          account_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions_en: string
          instructions_pt: string
          mpesa_number: string
          version?: never
        }
        Update: {
          account_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instructions_en?: string
          instructions_pt?: string
          mpesa_number?: string
          version?: never
        }
        Relationships: []
      }
      news_likes: {
        Row: {
          created_at: string
          id: string
          news_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          news_key: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          news_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_en: string | null
          body_pt: string
          broadcast_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title_en: string | null
          title_pt: string
          type: string
          user_id: string
        }
        Insert: {
          body_en?: string | null
          body_pt: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title_en?: string | null
          title_pt: string
          type?: string
          user_id: string
        }
        Update: {
          body_en?: string | null
          body_pt?: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title_en?: string | null
          title_pt?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          id: string
          kind: string
          points: number
          reason: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          points: number
          reason: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          points?: number
          reason?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_provinces: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          province_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          province_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_provinces_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_provinces_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_provinces_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          duration_days: number | null
          id: string
          interests: string[] | null
          is_internal: boolean
          locale: string
          muted_notification_types: string[]
          phone: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          duration_days?: number | null
          id: string
          interests?: string[] | null
          is_internal?: boolean
          locale?: string
          muted_notification_types?: string[]
          phone?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          duration_days?: number | null
          id?: string
          interests?: string[] | null
          is_internal?: boolean
          locale?: string
          muted_notification_types?: string[]
          phone?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provinces: {
        Row: {
          active: boolean
          code: string
          cover_image: string | null
          created_at: string
          id: string
          name_en: string
          name_pt: string
        }
        Insert: {
          active?: boolean
          code: string
          cover_image?: string | null
          created_at?: string
          id?: string
          name_en: string
          name_pt: string
        }
        Update: {
          active?: boolean
          code?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          name_en?: string
          name_pt?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          code: string
          cost_points: number
          created_at: string
          id: string
          request_id: string
          reward_id: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          cost_points: number
          created_at?: string
          id?: string
          request_id: string
          reward_id: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          code?: string
          cost_points?: number
          created_at?: string
          id?: string
          request_id?: string
          reward_id?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          business_id: string | null
          cost_points: number
          created_at: string
          description_en: string | null
          description_pt: string | null
          id: string
          stock: number | null
          title_en: string | null
          title_pt: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          cost_points: number
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          id?: string
          stock?: number | null
          title_en?: string | null
          title_pt: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          business_id?: string | null
          cost_points?: number
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          id?: string
          stock?: number | null
          title_en?: string | null
          title_pt?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      route_days: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          is_unassigned: boolean
          route_id: string
          title: string | null
          title_en: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          description?: string | null
          id?: string
          is_unassigned?: boolean
          route_id: string
          title?: string | null
          title_en?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          is_unassigned?: boolean
          route_id?: string
          title?: string | null
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_days_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_progress: {
        Row: {
          completed_at: string | null
          current_day: number
          id: string
          route_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_day?: number
          id?: string
          route_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_day?: number
          id?: string
          route_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_progress_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stop_progress: {
        Row: {
          completed_at: string
          id: string
          lat: number | null
          lng: number | null
          location_accuracy_m: number | null
          location_distance_m: number | null
          location_verified: boolean | null
          photo_path: string | null
          progress_id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          route_stop_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_accuracy_m?: number | null
          location_distance_m?: number | null
          location_verified?: boolean | null
          photo_path?: string | null
          progress_id: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_stop_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_accuracy_m?: number | null
          location_distance_m?: number | null
          location_verified?: boolean | null
          photo_path?: string | null
          progress_id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stop_progress_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "route_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_progress_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_progress_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_progress_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          community_candidate: boolean
          community_candidate_reason: string | null
          community_experience_id: string | null
          created_at: string
          custom_title_en: string | null
          custom_title_pt: string | null
          description_en: string | null
          description_pt: string | null
          destination_id: string | null
          estimated_duration_minutes: number | null
          experience_id: string | null
          id: string
          is_free: boolean | null
          lat: number | null
          lng: number | null
          location: string | null
          notes: string | null
          route_day_id: string
          stop_order: number
          stop_type: string | null
          validation_status: string
        }
        Insert: {
          community_candidate?: boolean
          community_candidate_reason?: string | null
          community_experience_id?: string | null
          created_at?: string
          custom_title_en?: string | null
          custom_title_pt?: string | null
          description_en?: string | null
          description_pt?: string | null
          destination_id?: string | null
          estimated_duration_minutes?: number | null
          experience_id?: string | null
          id?: string
          is_free?: boolean | null
          lat?: number | null
          lng?: number | null
          location?: string | null
          notes?: string | null
          route_day_id: string
          stop_order: number
          stop_type?: string | null
          validation_status?: string
        }
        Update: {
          community_candidate?: boolean
          community_candidate_reason?: string | null
          community_experience_id?: string | null
          created_at?: string
          custom_title_en?: string | null
          custom_title_pt?: string | null
          description_en?: string | null
          description_pt?: string | null
          destination_id?: string | null
          estimated_duration_minutes?: number | null
          experience_id?: string | null
          id?: string
          is_free?: boolean | null
          lat?: number | null
          lng?: number | null
          location?: string | null
          notes?: string | null
          route_day_id?: string
          stop_order?: number
          stop_type?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_community_experience_id_fkey"
            columns: ["community_experience_id"]
            isOneToOne: false
            referencedRelation: "community_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_day_id_fkey"
            columns: ["route_day_id"]
            isOneToOne: false
            referencedRelation: "route_days"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          catalog_notes_en: string | null
          catalog_notes_pt: string | null
          community_candidates: Json
          cover_image: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          description_en: string | null
          duration_days: number
          id: string
          intensity: string | null
          interests: string[]
          is_curated: boolean
          is_public: boolean
          owner_id: string | null
          province_id: string | null
          rejection_reason: string | null
          requires_validation: boolean
          review_status: string
          source_route_id: string | null
          status: string
          submitted_at: string | null
          subtitle_en: string | null
          subtitle_pt: string | null
          title: string
          title_en: string | null
          unique_code: string
          updated_at: string
        }
        Insert: {
          catalog_notes_en?: string | null
          catalog_notes_pt?: string | null
          community_candidates?: Json
          cover_image?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          description_en?: string | null
          duration_days?: number
          id?: string
          intensity?: string | null
          interests?: string[]
          is_curated?: boolean
          is_public?: boolean
          owner_id?: string | null
          province_id?: string | null
          rejection_reason?: string | null
          requires_validation?: boolean
          review_status?: string
          source_route_id?: string | null
          status?: string
          submitted_at?: string | null
          subtitle_en?: string | null
          subtitle_pt?: string | null
          title: string
          title_en?: string | null
          unique_code: string
          updated_at?: string
        }
        Update: {
          catalog_notes_en?: string | null
          catalog_notes_pt?: string | null
          community_candidates?: Json
          cover_image?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          description_en?: string | null
          duration_days?: number
          id?: string
          intensity?: string | null
          interests?: string[]
          is_curated?: boolean
          is_public?: boolean
          owner_id?: string | null
          province_id?: string | null
          rejection_reason?: string | null
          requires_validation?: boolean
          review_status?: string
          source_route_id?: string | null
          status?: string
          submitted_at?: string | null
          subtitle_en?: string | null
          subtitle_pt?: string | null
          title?: string
          title_en?: string | null
          unique_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_source_route_id_fkey"
            columns: ["source_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_placements: {
        Row: {
          body_en: string | null
          body_pt: string | null
          business_id: string
          campaign_type: string | null
          category_code: string | null
          config_version: number
          created_at: string
          decision_reason: string | null
          duration: string
          ends_on: string
          experience_id: string | null
          free: boolean
          id: string
          kind: string
          paid_at: string | null
          paid_marked_by: string | null
          payment_note: string | null
          price_cents: number
          province_id: string | null
          reference: string
          requested_by: string | null
          scope: string
          starts_on: string
          status: string
          title_en: string | null
          title_pt: string | null
          updated_at: string
        }
        Insert: {
          body_en?: string | null
          body_pt?: string | null
          business_id: string
          campaign_type?: string | null
          category_code?: string | null
          config_version: number
          created_at?: string
          decision_reason?: string | null
          duration: string
          ends_on: string
          experience_id?: string | null
          free?: boolean
          id?: string
          kind: string
          paid_at?: string | null
          paid_marked_by?: string | null
          payment_note?: string | null
          price_cents: number
          province_id?: string | null
          reference: string
          requested_by?: string | null
          scope: string
          starts_on: string
          status?: string
          title_en?: string | null
          title_pt?: string | null
          updated_at?: string
        }
        Update: {
          body_en?: string | null
          body_pt?: string | null
          business_id?: string
          campaign_type?: string | null
          category_code?: string | null
          config_version?: number
          created_at?: string
          decision_reason?: string | null
          duration?: string
          ends_on?: string
          experience_id?: string | null
          free?: boolean
          id?: string
          kind?: string
          paid_at?: string | null
          paid_marked_by?: string | null
          payment_note?: string | null
          price_cents?: number
          province_id?: string | null
          reference?: string
          requested_by?: string | null
          scope?: string
          starts_on?: string
          status?: string
          title_en?: string | null
          title_pt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_placements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_placements_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sponsored_placements_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_placements_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_post_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_post_authors: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_legal_documents: {
        Args: { _privacy_version: string; _terms_version: string }
        Returns: undefined
      }
      active_sponsored: {
        Args: { _category_code?: string; _province_id?: string; _scope: string }
        Returns: {
          body_en: string
          body_pt: string
          business_id: string
          business_name: string
          campaign_type: string
          ends_on: string
          experience_id: string
          id: string
          kind: string
          title_en: string
          title_pt: string
        }[]
      }
      admin_assign_business_owner: {
        Args: { _business_id: string; _email: string }
        Returns: Json
      }
      admin_business_owner_emails: {
        Args: never
        Returns: {
          business_id: string
          email: string
        }[]
      }
      admin_create_business_invite: {
        Args: { _business_id: string; _days?: number }
        Returns: string
      }
      admin_decide_business: {
        Args: {
          _business_id: string
          _decision: Database["public"]["Enums"]["business_status"]
          _reason?: string
        }
        Returns: undefined
      }
      admin_decide_placement: {
        Args: {
          _decision: string
          _id: string
          _payment_note?: string
          _reason?: string
        }
        Returns: Json
      }
      admin_import_content: {
        Args: { _dry_run?: boolean; _rows: Json }
        Returns: Json
      }
      admin_launch_status: { Args: never; Returns: Json }
      admin_list_broadcasts: {
        Args: { _limit?: number }
        Returns: {
          audience: string
          body_en: string
          body_pt: string
          created_at: string
          id: string
          link: string
          recipients: number
          sender: string
          target: string
          title_en: string
          title_pt: string
        }[]
      }
      admin_mark_unanswered: { Args: { _id: string }; Returns: undefined }
      admin_platform_summary: { Args: never; Returns: Json }
      admin_save_faq_entry: {
        Args: { _entry: Json; _id: string; _reason: string }
        Returns: string
      }
      admin_send_notification: {
        Args: {
          _audience: string
          _body_en: string
          _body_pt: string
          _link?: string
          _title_en: string
          _title_pt: string
          _user_id: string
        }
        Returns: Json
      }
      admin_set_business_status: {
        Args: {
          _business_id: string
          _reason?: string
          _status: Database["public"]["Enums"]["business_status"]
        }
        Returns: Json
      }
      admin_set_commercial_config: {
        Args: {
          _commission_bp: number
          _founder_cap: number
          _founder_commission_bp: number
          _founder_free_highlights: number
          _founder_months: number
          _highlight_month_cents: number
          _highlight_week_cents: number
          _plan_month_cents: number
          _provider_fee_bp: number
          _reason: string
        }
        Returns: number
      }
      admin_set_founder: {
        Args: { _business_id: string; _founder: boolean; _reason: string }
        Returns: Json
      }
      admin_set_internal: {
        Args: { _internal: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_lead_status: {
        Args: {
          _business_id?: string
          _id: string
          _note?: string
          _status: string
        }
        Returns: undefined
      }
      admin_set_manual_payment: {
        Args: {
          _account_name: string
          _instructions_en: string
          _instructions_pt: string
          _mpesa_number: string
          _reason: string
        }
        Returns: number
      }
      admin_set_sponsored_limits: {
        Args: { _per_page: number; _reason: string; _slots_per_scope: number }
        Returns: number
      }
      admin_set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: string[]
      }
      answer_game_quiz: {
        Args: { _attempt_id: string; _choice: number; _question_id: string }
        Returns: Json
      }
      app_errors_purge: { Args: never; Returns: number }
      apply_exchange_rates: { Args: never; Returns: number }
      assistant_log_unanswered: {
        Args: { _lang: string; _question: string }
        Returns: undefined
      }
      assistant_purge_old: { Args: never; Returns: number }
      assistant_rate_answer: {
        Args: { _helpful: boolean; _lang: string; _slug: string }
        Returns: undefined
      }
      booked_people: {
        Args: { _date: string; _experience_id: string; _time: string }
        Returns: number
      }
      business_decide_booking: {
        Args: {
          _booking_id: string
          _decision: Database["public"]["Enums"]["booking_status"]
          _reason?: string
        }
        Returns: undefined
      }
      business_invite_preview: { Args: { _token: string }; Returns: Json }
      business_missing: {
        Args: { b: Database["public"]["Tables"]["businesses"]["Row"] }
        Returns: string[]
      }
      can_edit_route: { Args: { _route_id: string }; Returns: boolean }
      can_view_route: { Args: { _route_id: string }; Returns: boolean }
      cancel_my_booking: { Args: { _booking_id: string }; Returns: undefined }
      cancel_my_placement: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      claim_business_invite: { Args: { _token: string }; Returns: string }
      commercial_activity_public: {
        Args: { _business_id: string }
        Returns: boolean
      }
      commission_quote: {
        Args: { _business_id: string; _gross_cents: number }
        Returns: Json
      }
      commission_split: {
        Args: { _commission_bp: number; _fee_bp: number; _gross_cents: number }
        Returns: {
          commission_cents: number
          net_cents: number
          provider_fee_cents: number
        }[]
      }
      content_readiness: { Args: { _business_id: string }; Returns: Json }
      content_slug: { Args: { _name: string }; Returns: string }
      current_commercial_config: {
        Args: never
        Returns: {
          commission_bp: number
          created_at: string
          created_by: string | null
          founder_cap: number
          founder_commission_bp: number
          founder_free_highlights: number
          founder_months: number
          highlight_month_cents: number
          highlight_week_cents: number
          id: string
          note: string | null
          plan_month_cents: number
          provider_fee_bp: number
          sponsored_per_page: number
          sponsored_slots_per_scope: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "commercial_configs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_legal_versions: { Args: never; Returns: Json }
      delete_my_account: { Args: { _confirm: string }; Returns: string }
      distance_m: {
        Args: { _lat1: number; _lat2: number; _lng1: number; _lng2: number }
        Returns: number
      }
      event_participant_counts: {
        Args: { _keys: string[] }
        Returns: {
          event_key: string
          participants: number
        }[]
      }
      experience_missing: {
        Args: { e: Database["public"]["Tables"]["experiences"]["Row"] }
        Returns: string[]
      }
      expire_stale_bookings: { Args: never; Returns: number }
      finish_game_quiz: { Args: { _attempt_id: string }; Returns: Json }
      founder_places_left: { Args: never; Returns: number }
      game_assert_playable: {
        Args: { _game_key: string }
        Returns: {
          category: string
          key: string
          sort_order: number
          total: number
          unlock_after: string | null
          verification: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_booking_code: { Args: never; Returns: string }
      generate_route_code: { Args: never; Returns: string }
      get_experience_availability: {
        Args: { _date: string; _experience_id: string }
        Returns: {
          available: boolean
          booked_people: number
          capacity: number
          date: string
          end_time: string
          experience_id: string
          remaining_capacity: number
          start_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_founder: {
        Args: { _at?: string; _business_id: string }
        Returns: boolean
      }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
      log_app_error: {
        Args: {
          _kind: string
          _message: string
          _release: string
          _route: string
        }
        Returns: undefined
      }
      my_points_summary: { Args: never; Returns: Json }
      my_points_total: { Args: never; Returns: number }
      news_like_counts: {
        Args: { _keys: string[] }
        Returns: {
          likes: number
          news_key: string
        }[]
      }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      owns_experience: { Args: { _experience_id: string }; Returns: boolean }
      platform_impact_stats: { Args: never; Returns: Json }
      points_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          display_name: string
          is_me: boolean
          rank: number
          xp: number
        }[]
      }
      points_value: { Args: { _reason: string }; Returns: number }
      proof_location_check: {
        Args: {
          _accuracy_m: number
          _lat: number
          _lng: number
          _target_lat: number
          _target_lng: number
        }
        Returns: Record<string, unknown>
      }
      redeem_reward: {
        Args: { _request_id: string; _reward_id: string }
        Returns: Json
      }
      request_exchange_rates: { Args: never; Returns: number }
      request_ip: { Args: never; Returns: string }
      request_sponsored_placement: {
        Args: {
          _body_en: string
          _body_pt: string
          _business_id: string
          _campaign_type: string
          _category_code: string
          _duration: string
          _experience_id: string
          _kind: string
          _province_id: string
          _scope: string
          _starts_on: string
          _title_en: string
          _title_pt: string
        }
        Returns: Json
      }
      reset_my_route_progress: {
        Args: { _progress_id: string }
        Returns: undefined
      }
      review_stop_proof: {
        Args: {
          _approve: boolean
          _progress_id: string
          _route_stop_id: string
        }
        Returns: string
      }
      route_progress_fully_proven: {
        Args: { _progress_id: string }
        Returns: boolean
      }
      route_stop_coords: {
        Args: { _stop_id: string }
        Returns: Record<string, unknown>
      }
      save_my_preferences: {
        Args: {
          _duration_days: number
          _interests: string[]
          _province: string
          _provinces?: string[]
        }
        Returns: undefined
      }
      save_route_plan: {
        Args: { _curated?: boolean; _input: Json; _route_id: string }
        Returns: string
      }
      sponsored_notify: {
        Args: {
          _p: Database["public"]["Tables"]["sponsored_placements"]["Row"]
          _to_admins: boolean
        }
        Returns: undefined
      }
      sponsored_placements_tick: { Args: never; Returns: number }
      start_game_quiz: { Args: { _game_key: string }; Returns: Json }
      submit_business_lead: {
        Args: {
          _accepts_bookings: boolean
          _business_name: string
          _category_code: string
          _contact: string
          _contact_name: string
          _lang: string
          _message: string
          _province_id: string
          _website?: string
        }
        Returns: string
      }
      submit_game_step: {
        Args: {
          _accuracy_m?: number
          _details: Json
          _game_key: string
          _lat?: number
          _lng?: number
          _proof_path: string
          _step_ref: string
        }
        Returns: Json
      }
      submit_stop_proof: {
        Args: {
          _accuracy_m?: number
          _lat?: number
          _lng?: number
          _photo_path: string
          _progress_id: string
          _route_stop_id: string
        }
        Returns: Json
      }
      validate_voucher: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "tourist" | "business_small" | "business_large" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
        | "no_show"
      business_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["tourist", "business_small", "business_large", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "no_show",
      ],
      business_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
