import { describe, it, expect } from "vitest";
import {
  UpdateProfileSchema,
  CreateGigSchema,
  UpdateGigSchema,
  GigIdSchema,
} from "./schemas.js";

describe("UpdateProfileSchema", () => {
  it("accepts valid partial input", () => {
    expect(UpdateProfileSchema.safeParse({ bio: "hello" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid language level", () => {
    expect(
      UpdateProfileSchema.safeParse({
        languages: [{ lang: "English", level: "expert" }],
      }).success
    ).toBe(false);
  });

  it("accepts valid language level", () => {
    expect(
      UpdateProfileSchema.safeParse({
        languages: [{ lang: "English", level: "native" }],
      }).success
    ).toBe(true);
  });
});

describe("CreateGigSchema", () => {
  it("requires title", () => {
    expect(CreateGigSchema.safeParse({ description: "no title" }).success).toBe(false);
  });

  it("accepts title with optional fields", () => {
    expect(
      CreateGigSchema.safeParse({ title: "I will build your website", tags: ["react"] }).success
    ).toBe(true);
  });

  it("rejects more than 5 tags", () => {
    expect(
      CreateGigSchema.safeParse({ title: "test", tags: ["a", "b", "c", "d", "e", "f"] }).success
    ).toBe(false);
  });
});

describe("UpdateGigSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateGigSchema.safeParse({}).success).toBe(true);
  });
});

describe("GigIdSchema", () => {
  it("requires gigId", () => {
    expect(GigIdSchema.safeParse({}).success).toBe(false);
  });

  it("accepts valid gigId", () => {
    expect(GigIdSchema.safeParse({ gigId: "abc123" }).success).toBe(true);
  });
});
