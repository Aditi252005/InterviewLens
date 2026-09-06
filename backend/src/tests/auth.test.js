const { requireAuth } = require("../middleware/auth");

describe("requireAuth middleware", () => {
  test("rejects an unauthenticated request with 401", () => {
    const req = { isAuthenticated: () => false };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows an authenticated request through", () => {
    const req = { isAuthenticated: () => true, user: { id: "abc123" } };
    const res = { status: jest.fn(), json: jest.fn() };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
