export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      artist_availability: {
        Row: {
          artist_id: string;
          created_at: string;
          date: string;
          id: string;
          note: string | null;
          status: Database["public"]["Enums"]["availability_status"];
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          date: string;
          id?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["availability_status"];
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["availability_status"];
        };
        Relationships: [
          {
            foreignKeyName: "artist_availability_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      artists: {
        Row: {
          artist_type: Database["public"]["Enums"]["artist_type"];
          bio: string | null;
          city: string;
          created_at: string;
          genres: string[];
          hourly_rate: number | null;
          id: string;
          image_url: string | null;
          is_published: boolean;
          is_suspended: boolean;
          links: Json;
          location: string;
          members_count: number | null;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          artist_type?: Database["public"]["Enums"]["artist_type"];
          bio?: string | null;
          city?: string;
          created_at?: string;
          genres?: string[];
          hourly_rate?: number | null;
          id?: string;
          image_url?: string | null;
          is_published?: boolean;
          is_suspended?: boolean;
          links?: Json;
          location?: string;
          members_count?: number | null;
          name: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          artist_type?: Database["public"]["Enums"]["artist_type"];
          bio?: string | null;
          city?: string;
          created_at?: string;
          genres?: string[];
          hourly_rate?: number | null;
          id?: string;
          image_url?: string | null;
          is_published?: boolean;
          is_suspended?: boolean;
          links?: Json;
          location?: string;
          members_count?: number | null;
          name?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          agreed_price: number | null;
          artist_id: string;
          created_at: string;
          event_end: string;
          event_start: string;
          expected_attendance: number;
          gig_id: string | null;
          id: string;
          notes: string | null;
          organizer_id: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          title: string;
          updated_at: string;
          venue_id: string | null;
        };
        Insert: {
          agreed_price?: number | null;
          artist_id: string;
          created_at?: string;
          event_end: string;
          event_start: string;
          expected_attendance?: number;
          gig_id?: string | null;
          id?: string;
          notes?: string | null;
          organizer_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          title?: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          agreed_price?: number | null;
          artist_id?: string;
          created_at?: string;
          event_end?: string;
          event_start?: string;
          expected_attendance?: number;
          gig_id?: string | null;
          id?: string;
          notes?: string | null;
          organizer_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          title?: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_gig_id_fkey";
            columns: ["gig_id"];
            isOneToOne: false;
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      gig_applications: {
        Row: {
          artist_id: string;
          created_at: string;
          gig_id: string;
          id: string;
          message: string | null;
          quoted_price: number | null;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          gig_id: string;
          id?: string;
          message?: string | null;
          quoted_price?: number | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          gig_id?: string;
          id?: string;
          message?: string | null;
          quoted_price?: number | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gig_applications_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gig_applications_gig_id_fkey";
            columns: ["gig_id"];
            isOneToOne: false;
            referencedRelation: "gigs";
            referencedColumns: ["id"];
          },
        ];
      };
      gigs: {
        Row: {
          budget: number | null;
          created_at: string;
          description: string | null;
          event_end: string;
          event_start: string;
          expected_attendance: number;
          genres: string[];
          id: string;
          organizer_id: string | null;
          status: Database["public"]["Enums"]["gig_status"];
          title: string;
          updated_at: string;
          venue_id: string | null;
        };
        Insert: {
          budget?: number | null;
          created_at?: string;
          description?: string | null;
          event_end: string;
          event_start: string;
          expected_attendance?: number;
          genres?: string[];
          id?: string;
          organizer_id?: string | null;
          status?: Database["public"]["Enums"]["gig_status"];
          title: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          budget?: number | null;
          created_at?: string;
          description?: string | null;
          event_end?: string;
          event_start?: string;
          expected_attendance?: number;
          genres?: string[];
          id?: string;
          organizer_id?: string | null;
          status?: Database["public"]["Enums"]["gig_status"];
          title?: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gigs_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          booking_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          booking_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          booking_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          artist_id: string;
          booking_id: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          reviewer_id: string | null;
          reviewer_name: string;
        };
        Insert: {
          artist_id: string;
          booking_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          reviewer_id?: string | null;
          reviewer_name?: string;
        };
        Update: {
          artist_id?: string;
          booking_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          reviewer_id?: string | null;
          reviewer_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          images: string[];
          max_capacity: number;
          name: string;
          owner_id: string | null;
          updated_at: string;
          venue_type: string;
        };
        Insert: {
          address?: string;
          city?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          images?: string[];
          max_capacity: number;
          name: string;
          owner_id?: string | null;
          updated_at?: string;
          venue_type?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          images?: string[];
          max_capacity?: number;
          name?: string;
          owner_id?: string | null;
          updated_at?: string;
          venue_type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_gig_application: { Args: { _application_id: string }; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      in_booking: { Args: { _booking_id: string }; Returns: boolean };
      owns_artist: { Args: { _artist_id: string }; Returns: boolean };
      owns_gig: { Args: { _gig_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "artist" | "organizer" | "admin";
      application_status: "pending" | "accepted" | "rejected" | "withdrawn";
      artist_type: "band" | "solo";
      availability_status: "open" | "blocked";
      booking_status: "pending" | "confirmed" | "declined" | "cancelled" | "completed";
      gig_status: "open" | "closed" | "filled" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["artist", "organizer", "admin"],
      application_status: ["pending", "accepted", "rejected", "withdrawn"],
      artist_type: ["band", "solo"],
      availability_status: ["open", "blocked"],
      booking_status: ["pending", "confirmed", "declined", "cancelled", "completed"],
      gig_status: ["open", "closed", "filled", "cancelled"],
    },
  },
} as const;
