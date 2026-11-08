import { describe, expect, it } from "vitest";

import {
  REPRESENTATIVE_ROLE_OPTIONS,
  validateRepresentativeRole,
} from "@/lib/representative-role";

describe("representative role", () => {
  it("allows only the four configured options", () => {
    for (const option of REPRESENTATIVE_ROLE_OPTIONS) {
      expect(validateRepresentativeRole(option)).toBeNull();
    }
    expect(validateRepresentativeRole("Dean")).not.toBeNull();
    expect(validateRepresentativeRole("Other")).not.toBeNull();
  });
});
