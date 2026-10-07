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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      businesses: {
        Row: {
          category: string | null
          category_code: string | null
          contact: Json | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location: Json | null
          name: string
          owner_id: string | null
          province: string | null
          province_id: string | null
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
          description?: string | null
          id?: string
          images?: string[] | null
          location?: Json | null
          name: string
          owner_id?: string | null
          province?: string | null
          province_id?: string | null
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
          description?: string | null
          id?: string
          images?: string[] | null
          location?: Json | null
          name?: string
          owner_id?: string | null
          province?: string | null
          province_id?: string | null
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
      experience_availability: {
        Row: {
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
          display_name: string | null
          duration_days: number | null
          id: string
          interests: string[] | null
          locale: string
          phone: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          duration_days?: number | null
          id: string
          interests?: string[] | null
          locale?: string
          phone?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          duration_days?: number | null
          id?: string
          interests?: string[] | null
          locale?: string
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
      route_days: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          route_id: string
          title: string | null
          title_en: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          description?: string | null
          id?: string
          route_id: string
          title?: string | null
          title_en?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
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
          photo_path: string | null
          progress_id: string
          route_stop_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          photo_path?: string | null
          progress_id: string
          route_stop_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          photo_path?: string | null
          progress_id?: string
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
        }
        Insert: {
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
        }
        Update: {
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
      booked_people: {
        Args: { _date: string; _experience_id: string; _time: string }
        Returns: number
      }
      can_edit_route: { Args: { _route_id: string }; Returns: boolean }
      can_view_route: { Args: { _route_id: string }; Returns: boolean }
      cancel_my_booking: { Args: { _booking_id: string }; Returns: undefined }
      event_participant_counts: {
        Args: { _keys: string[] }
        Returns: {
          event_key: string
          participants: number
        }[]
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
      news_like_counts: {
        Args: { _keys: string[] }
        Returns: {
          likes: number
          news_key: string
        }[]
      }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      owns_experience: { Args: { _experience_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "tourist" | "business_small" | "business_large" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
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
      ],
      business_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
