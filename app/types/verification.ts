export interface Metadata {
  user_type: string;
  account_id: string;
}

export interface Warning {
  risk: string;
  additional_data: any | null;
  log_type: string;
  short_description: string;
  long_description: string;
}

export interface IdVerification {
  status: string;
  document_type: string;
  document_number: string;
  personal_number: string;
  portrait_image: string | null;
  front_image: string | null;
  front_video: string | null;
  back_image: string | null;
  back_video: string | null;
  full_front_image: string | null;
  full_back_image: string | null;
  date_of_birth: string;
  age: number;
  expiration_date: string;
  date_of_issue: string;
  issuing_state: string;
  issuing_state_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  address: string;
  formatted_address: string;
  place_of_birth: string;
  marital_status: string;
  nationality: string;
  extra_fields: {
    dl_categories: string[];
    blood_group: string | null;
  };
  parsed_address: {
    id: string;
    city: string;
    label: string;
    region: string;
    street_1: string;
    street_2: string | null;
    postal_code: string;
    raw_results: any;
  } | null;
  extra_files: string[];
  warnings: Warning[];
}

export interface NfcLiveness {
  status: string;
  method: string;
  score: number;
  reference_image: string;
  video_url: string;
  age_estimation: number;
  warnings: Warning[];
}

export interface NfcFaceMatch {
  status: string;
  score: number;
  source_image: string;
  target_image: string;
  warnings: Warning[];
}

export interface Nfc {
  status: string;
  portrait_image: string;
  signature_image: string;
  chip_data: {
    document_type: string;
    issuing_country: string;
    document_number: string;
    expiration_date: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: string;
    nationality: string;
    address: string;
    place_of_birth: string;
  };
  authenticity: {
    sod_integrity: boolean;
    dg_integrity: boolean;
  };
  certificate_summary: {
    issuer: string;
    subject: string;
    serial_number: string;
    not_valid_after: string;
    not_valid_before: string;
  };
  warnings: Warning[];
  liveness: NfcLiveness;
  face_match: NfcFaceMatch;
}

export interface Phone {
  status: string;
  phone_number_prefix: string;
  phone_number: string;
  full_number: string;
  country_code: string;
  country_name: string;
  carrier: {
    name: string;
    type: string;
  };
  is_disposable: boolean;
  is_virtual: boolean;
  verification_method: string;
  verification_attempts: number;
  verified_at: string;
  warnings: Warning[];
}

export interface Poa {
  status: string;
  document_file: string;
  issuing_state: string;
  document_type: string;
  document_language: string;
  issuer: string;
  issue_date: string;
  poa_address: string;
  poa_formatted_address: string;
  poa_parsed_address: {
    street_1: string;
    street_2: string | null;
    city: string;
    region: string;
    country: string;
    postal_code: string;
    document_location: {
      latitude: number;
      longitude: number;
    };
  } | null;
  expected_details_address: string | null;
  expected_details_formatted_address: string | null;
  expected_details_parsed_address: any | null;
  extra_files: string[];
  warnings: Warning[];
}

export interface AmlHitProperties {
  name: string[];
  alias?: string[];
  notes?: string[];
  gender?: string[];
  topics?: string[];
  position?: string[];
  country?: string[];
}

export interface AmlHit {
  id: string;
  url: string;
  match: boolean;
  score: number;
  target: boolean;
  caption: string;
  datasets: string[];
  features: Record<string, number>;
  last_seen: string;
  first_seen: string;
  properties: AmlHitProperties;
  last_change?: string;
}

export interface Aml {
  status: string;
  total_hits: number;
  hits: AmlHit[];
  score: number;
  screened_data: {
    full_name: string;
    nationality: string;
    date_of_birth: string;
    document_number: string;
  };
  warnings: Warning[];
}

export interface IpAnalysisLocationDetail {
  location: {
    latitude: number;
    longitude: number;
  };
  distance_from_id_document?: number;
  distance_from_poa_document?: number;
  distance_from_ip?: number;
}

export interface IpAnalysisLocationsInfo {
  ip: IpAnalysisLocationDetail;
  id_document: IpAnalysisLocationDetail;
  poa_document: IpAnalysisLocationDetail;
}

export interface IpAnalysis {
  status: string;
  device_brand: string;
  device_model: string;
  browser_family: string;
  os_family: string;
  platform: string;
  ip_country: string;
  ip_country_code: string;
  ip_state: string;
  ip_city: string;
  latitude: number;
  longitude: number;
  ip_address: string;
  isp: string | null;
  organization: string | null;
  is_vpn_or_tor: boolean;
  is_data_center: boolean;
  time_zone: string;
  time_zone_offset: string;
  locations_info: IpAnalysisLocationsInfo;
  warnings: Warning[];
}

export interface Review {
  user: string;
  new_status: string;
  comment: string;
  created_at: string;
}

export interface VerificationSession {
  session_id: string;
  session_number: number;
  session_token: string;
  vendor_data: string;
  metadata: Metadata;
  status: string;
  workflow_id: string;
  callback: string;
  url: string;
}

export interface VerificationDecision {
  session_id: string;
  session_number: number;
  session_url: string;
  status: string;
  workflow_id: string;
  features: string[];
  vendor_data: string;
  metadata: Metadata;
  callback: string;
  id_verification?: IdVerification;
  nfc?: Nfc;
  phone?: Phone;
  poa?: Poa;
  aml?: Aml;
  ip_analysis?: IpAnalysis;
  reviews?: Review[];
  created_at: string;
} 