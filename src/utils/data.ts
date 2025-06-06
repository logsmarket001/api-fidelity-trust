import { UserRole } from "../models/User";

export const usersData = [
  {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "password123",
    pin: "1234",
    role: UserRole.USER,
    balance: 5000,
    availableBalance: 5000,
    currentBalance: 5000,
    isEmailVerified: true,
    kycVerified: true,
    personalInfo: {
      phone: "+1234567890",
      address: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
    },
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    password: "password123",
    pin: "5678",
    role: UserRole.USER,
    balance: 7500,
    availableBalance: 7500,
    currentBalance: 7500,
    isEmailVerified: true,
    kycVerified: true,
    personalInfo: {
      phone: "+1987654321",
      address: "456 Oak Ave",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90001",
    },
  },
  {
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.j@example.com",
    password: "password123",
    pin: "9012",
    role: UserRole.USER,
    balance: 3000,
    availableBalance: 3000,
    currentBalance: 3000,
    isEmailVerified: true,
    kycVerified: true,
    personalInfo: {
      phone: "+1122334455",
      address: "789 Pine Rd",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
    },
  },
  {
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah.w@example.com",
    password: "password123",
    pin: "3456",
    role: UserRole.USER,
    balance: 10000,
    availableBalance: 10000,
    currentBalance: 10000,
    isEmailVerified: true,
    kycVerified: true,
    personalInfo: {
      phone: "+1555666777",
      address: "321 Elm St",
      city: "Houston",
      state: "TX",
      zipCode: "77001",
    },
  },
  {
    firstName: "David",
    lastName: "Brown",
    email: "david.b@example.com",
    password: "password123",
    pin: "7890",
    role: UserRole.USER,
    balance: 6000,
    availableBalance: 6000,
    currentBalance: 6000,
    isEmailVerified: true,
    kycVerified: true,
    personalInfo: {
      phone: "+1888999000",
      address: "654 Maple Dr",
      city: "Miami",
      state: "FL",
      zipCode: "33101",
    },
  },
];
