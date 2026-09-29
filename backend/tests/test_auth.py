from datetime import timedelta

from app.auth import (
    ROLE_BANK_OFFICER,
    ROLE_STATE_OFFICER,
    User,
    authenticate_user,
    create_access_token,
    decode_access_token,
)


def test_seeded_users_authenticate_and_round_trip_claims() -> None:
    user = authenticate_user("state.mh", "state123")
    assert user is not None
    assert user.role == ROLE_STATE_OFFICER
    assert decode_access_token(create_access_token(user)).state_scope == "Maharashtra"


def test_invalid_password_is_rejected() -> None:
    assert authenticate_user("bank.hdfc", "wrong") is None


def test_expired_token_is_rejected() -> None:
    token = create_access_token(User("test", ROLE_BANK_OFFICER), timedelta(seconds=-1))
    try:
        decode_access_token(token)
    except Exception as error:
        assert getattr(error, "status_code", None) == 401
    else:
        raise AssertionError("expired token was accepted")