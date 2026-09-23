export function validateSignup(email: string, password: string, confirmation: string, terms: boolean): string | null {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 주소를 입력해 주세요.";
  if (password.length < 8 || password.length > 128) return "비밀번호는 8자 이상 128자 이하로 입력해 주세요.";
  if (password !== confirmation) return "비밀번호가 일치하지 않습니다. 다시 확인해 주세요.";
  if (!terms) return "필수 약관에 동의해 주세요.";
  return null;
}

export function signupErrorMessage(code?: string): string {
  switch (code) {
    case "email_address_invalid":
    case "validation_failed": return "이메일 주소와 입력 내용을 다시 확인해 주세요.";
    case "weak_password": return "더 안전한 비밀번호를 사용해 주세요. 영문, 숫자, 특수문자를 조합해 주세요.";
    case "user_already_exists":
    case "email_exists": return "이미 가입된 이메일입니다. 로그인해 주세요.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    case "signup_disabled":
    case "email_provider_disabled": return "현재 회원가입을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    default: return "회원가입을 완료하지 못했습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해 주세요.";
  }
}
