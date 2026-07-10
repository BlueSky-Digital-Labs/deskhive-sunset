"""
Tests for JWT authentication endpoints in the accounts app.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
REFRESH_URL = '/api/v1/auth/refresh/'
ME_URL = '/api/v1/auth/me/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        'email': 'testuser@example.com',
        'password': 'securepass123',
    }


@pytest.fixture
def registered_user(api_client, user_data):
    api_client.post(REGISTER_URL, user_data, format='json')
    return user_data


@pytest.mark.django_db
class TestRegister:
    def test_registration_success(self, api_client, user_data):
        response = api_client.post(REGISTER_URL, user_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == user_data['email']
        assert 'id' in response.data
        assert 'date_joined' in response.data
        assert User.objects.filter(email=user_data['email']).exists()

    def test_registration_duplicate_email(self, api_client, user_data):
        api_client.post(REGISTER_URL, user_data, format='json')
        response = api_client.post(REGISTER_URL, user_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_missing_password(self, api_client):
        response = api_client.post(
            REGISTER_URL,
            {'email': 'missing@example.com'},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client, registered_user):
        response = api_client.post(
            LOGIN_URL,
            {
                'email': registered_user['email'],
                'password': registered_user['password'],
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_credentials(self, api_client, registered_user):
        response = api_client.post(
            LOGIN_URL,
            {
                'email': registered_user['email'],
                'password': 'wrongpassword',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        response = api_client.post(
            LOGIN_URL,
            {
                'email': 'nobody@example.com',
                'password': 'somepassword',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestRefresh:
    def test_refresh_success(self, api_client, registered_user):
        login_response = api_client.post(
            LOGIN_URL,
            {
                'email': registered_user['email'],
                'password': registered_user['password'],
            },
            format='json',
        )
        refresh_token = login_response.data['refresh']

        response = api_client.post(
            REFRESH_URL,
            {'refresh': refresh_token},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_refresh_invalid_token(self, api_client):
        response = api_client.post(
            REFRESH_URL,
            {'refresh': 'invalid-token'},
            format='json',
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMe:
    def test_me_authenticated(self, api_client, registered_user):
        login_response = api_client.post(
            LOGIN_URL,
            {
                'email': registered_user['email'],
                'password': registered_user['password'],
            },
            format='json',
        )
        access_token = login_response.data['access']

        response = api_client.get(
            ME_URL,
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == registered_user['email']
        assert 'id' in response.data
        assert 'date_joined' in response.data

    def test_me_unauthenticated(self, api_client):
        response = api_client.get(ME_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
