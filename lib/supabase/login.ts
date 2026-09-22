export function safeNext(value?: string): string {
  // Reject encoded separators/control characters as well as absolute URLs.
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]|%/u.test(value)) return "/mypage";
  const url = new URL(value, "https://internal.invalid");
  if (url.origin !== "https://internal.invalid" || url.pathname.startsWith("//") || url.pathname.startsWith("/auth/") || ["/login", "/signup"].includes(url.pathname)) return "/mypage";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function validateLogin(email: string, password: string): string | null {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 주소를 입력해 주세요.";
  if (!password) return "비밀번호를 입력해 주세요.";
  return null;
}

export function loginErrorMessage(code?: string): string {
  switch (code) {
    case "invalid_credentials": return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "email_not_confirmed": return "이메일 인증을 먼저 완료해 주세요. 받은 메일의 인증 링크를 확인해 주세요.";
    case "over_request_rate_limit": return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    default: return "로그인하지 못했습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해 주세요.";
  }
}
