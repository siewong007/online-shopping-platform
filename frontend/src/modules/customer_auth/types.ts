import type { CustomerLookupOrder, CustomerLookupProfile } from "../customer/types";

export type CustomerAccount = {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type CustomerRegisterInput = {
  email: string;
  password: string;
  display_name: string;
};

export type CustomerLoginInput = {
  email: string;
  password: string;
};

export type CustomerAuthPayload = {
  token: string;
  account: CustomerAccount;
};

export type CustomerMePayload = {
  account: CustomerAccount;
  profile: CustomerLookupProfile | null;
  orders: CustomerLookupOrder[];
};
