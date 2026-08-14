import {
  BusinessStructure,
  CompanyType,
  KycDetails,
} from "../types/users.types";

export const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const requiredKycDetails: Record<
  BusinessStructure,
  (keyof KycDetails)[] | Record<CompanyType, (keyof KycDetails)[]>
> = {
  individual: ["panNumber", "panCardUrl", "aadhaarUrl", "cancelledChequeUrl"],
  sole_proprietor: [
    "panNumber",
    "gstin",
    "panCardUrl",
    "aadhaarUrl",
    "cancelledChequeUrl",
    "gstCertificateUrl",
  ],
  partnership_firm: [
    "panNumber",
    "gstin",
    "partnershipDeedUrl",
    "panCardUrl",
    "aadhaarUrl",
    "cancelledChequeUrl",
    "gstCertificateUrl",
  ],
  company: {
    private_limited: [
      "panNumber",
      "gstin",
      "cin",
      "gstCertificateUrl",
      "boardResolutionUrl",
      "businessPanUrl",
      "aadhaarUrl",
    ],
    llp: [
      "panNumber",
      "gstin",
      "businessPanUrl",
      "aadhaarUrl",
      "companyAddressProofUrl",
      "cancelledChequeUrl",
      "llpAgreementUrl",
      "gstCertificateUrl",
    ],
    one_person_company: [
      "panNumber",
      "gstin",
      "businessPanUrl",
      "aadhaarUrl",
      "cin",
      "companyAddressProofUrl",
      "cancelledChequeUrl",
    ],
    section_8_company: [
      "panNumber",
      "gstin",
      "businessPanUrl",
      "aadhaarUrl",
      "companyAddressProofUrl",
      "boardResolutionUrl",
      "cancelledChequeUrl",
    ],
    public_limited: [
      "panNumber",
      "gstin",
      "businessPanUrl",
      "aadhaarUrl",
      "gstCertificateUrl",
    ],
  },
};

export const requiredKycFieldMap: Record<
  BusinessStructure,
  Record<string, boolean> | Record<CompanyType, Record<string, boolean>>
> = {
  individual: {
    panNumber: false,
    gstin: false,
    panCardUrl: false,
    aadhaarUrl: false,
    cancelledChequeUrl: false,
  },
  sole_proprietor: {
    panNumber: false,
    gstin: false,
    panCardUrl: false,
    aadhaarUrl: false,
    cancelledChequeUrl: false,
  },
  partnership_firm: {
    panNumber: false,
    gstin: false,
    partnershipDeedUrl: false,
    panCardUrl: false,
    aadhaarUrl: false,
    cancelledChequeUrl: false,
    gstCertificateUrl: false,
  },
  company: {
    private_limited: {
      panNumber: false,
      gstin: false,
      cin: false,
      gstCertificateUrl: false,
      boardResolutionUrl: false,
      businessPanUrl: false,
      aadhaarUrl: false,
    },
    llp: {
      panNumber: false,
      gstin: false,
      businessPanUrl: false,
      aadhaarUrl: false,
      companyAddressProofUrl: false,
      cancelledChequeUrl: false,
      llpAgreementUrl: false,
      gstCertificateUrl: false,
    },
    one_person_company: {
      panNumber: false,
      gstin: false,
      businessPanUrl: false,
      aadhaarUrl: false,
      cin: false,
      companyAddressProofUrl: false,
      cancelledChequeUrl: false,
    },
    section_8_company: {
      panNumber: false,
      gstin: false,
      businessPanUrl: false,
      aadhaarUrl: false,
      companyAddressProofUrl: false,
      boardResolutionUrl: false,
      cancelledChequeUrl: false,
    },
    public_limited: {
      panNumber: false,
      gstin: false,
      businessPanUrl: false,
      aadhaarUrl: false,
      gstCertificateUrl: false,
    },
  },
};
