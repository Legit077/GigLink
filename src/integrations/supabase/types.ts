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
      artists: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          genres: string[]
          hourly_rate: number | null
          id: string
          image_url: string | null
          instagram_url: string | null
          is_published: boolean
          kind: Database["public"]["Enums"]["artist_type"]
          members: number
          spotify_url: string | null
          stage_name: string
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          genres?: string[]
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_published?: boolean
          kind?: Database["public"]["Enums"]["artist_type"]
          members?: number
          spotify_url?: string | null
          stage_name: string
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          genres?: string[]
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_published?: boolean
          kind?: Database["public"]["Enums"]["artist_type"]
          members?: number
          spotify_url?: string | null
          stage_name?: string
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          artist_id: string
          budget: number | null
          created_at: string
          event_date: string
          expected_guests: number
          id: string
          message: string | null
          organizer_id: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          artist_id: string
          budget?: number | null
          created_at?: string
          event_date: string
          expected_guests?: number
          id?: string
          message?: string | null
          organizer_id: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          artist_id?: string
          budget?: number | null
          created_at?: string
          event_date?: string
          expected_guests?: number
          id?: string
          message?: string | null
          organizer_id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_applications: {
        Row: {
          artist_id: string
          created_at: string
          gig_id: string
          id: string
          message: string | null
          proposed_fee: number | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          gig_id: string
          id?: string
          message?: string | null
          proposed_fee?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          gig_id?: string
          id?: string
          message?: string | null
          proposed_fee?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_applications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_applications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          duration_hours: number
          event_date: string
          expected_attendance: number
          genres: string[]
          id: string
          location: string | null
          organizer_id: string
          payment: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["gig_status"]
          title: string
          updated_at: string
          venue_capacity: number
          venue_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          event_date: string
          expected_attendance?: number
          genres?: string[]
          id?: string
          location?: string | null
          organizer_id: string
          payment?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["gig_status"]
          title: string
          updated_at?: string
          venue_capacity?: number
          venue_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          event_date?: string
          expected_attendance?: number
          genres?: string[]
          id?: string
          location?: string | null
          organizer_id?: string
          payment?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["gig_status"]
          title?: string
          updated_at?: string
          venue_capacity?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gigs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artist_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
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
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          capacity: number
          city: string | null
          created_at: string
          description: string | null
          expected_guests: number
          id: string
          image_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number
          city?: string | null
          created_at?: string
          description?: string | null
          expected_guests?: number
          id?: string
          image_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number
          city?: string | null
          created_at?: string
          description?: string | null
          expected_guests?: number
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_gig_application: { Args: { app_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "artist" | "organizer" | "admin"
      application_status: "pending" | "accepted" | "rejected" | "withdrawn"
      artist_type: "band" | "solo"
      booking_status: "pending" | "accepted" | "declined" | "cancelled"
      gig_status: "open" | "closed" | "filled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["artist", "organizer", "admin"],
      application_status: ["pending", "accepted", "rejected", "withdrawn"],
      artist_type: ["band", "solo"],
      booking_status: ["pending", "accepted", "declined", "cancelled"],
      gig_status: ["open", "closed", "filled"],
    },
  },
} as const
