import {
  User,
  Mail,
  Calendar,
  Users,
  Phone,
  ImageIcon,
  UserCheck,
  MapPin,
  Building,
  Settings,
  Globe,
  Instagram,
  Music2,
  FileCheck,
} from "lucide-react";

export type ScopeItems = {
  user_id: boolean;
  picture: boolean;
  names: boolean;
  email: boolean;
  phone: boolean;
  gender: boolean;
  document_detail: boolean;
  birthdate: boolean;
  address: boolean;
  bank_account: boolean;
  preferences: boolean;
  is_verified: boolean;
  is_over_18: boolean;
  is_over_21: boolean;
  instagram_account: boolean;
  x_account: boolean;
  tiktok_account: boolean;
};

export const DEFAULT_SCOPE_ITEMS: ScopeItems = {
  user_id: true,
  picture: false,
  names: false,
  email: false,
  phone: false,
  gender: false,
  document_detail: false,
  birthdate: false,
  address: false,
  bank_account: false,
  preferences: false,
  is_verified: false,
  is_over_18: false,
  is_over_21: false,
  instagram_account: false,
  x_account: false,
  tiktok_account: false,
};

export const SCOPE_ICONS: { [key: string]: any } = {
  user_id: User,
  email: Mail,
  names: Users,
  phone: Phone,
  picture: ImageIcon,
  gender: User,
  document_detail: FileCheck,
  birthdate: Calendar,
  address: MapPin,
  bank_account: Building,
  preferences: Settings,
  is_verified: UserCheck,
  is_over_18: Calendar,
  is_over_21: Calendar,
  instagram_account: Instagram,
  x_account: User,
  tiktok_account: Music2,
}; 