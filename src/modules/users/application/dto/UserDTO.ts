export interface CreateUserDTO {
  email: string;
  name: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
