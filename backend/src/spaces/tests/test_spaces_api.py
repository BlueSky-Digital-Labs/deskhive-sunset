"""
Tests for spaces CRUD and availability API endpoints.
"""

from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from spaces.models import Desk, Floor, Room

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
FLOORS_URL = '/api/v1/floors/'
DESKS_URL = '/api/v1/desks/'
ROOMS_URL = '/api/v1/rooms/'
DESKS_AVAILABILITY_URL = '/api/v1/availability/desks/'
ROOMS_AVAILABILITY_URL = '/api/v1/availability/rooms/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    user_data = {
        'email': 'spaces-user@example.com',
        'password': 'securepass123',
    }
    api_client.post(REGISTER_URL, user_data, format='json')
    login_response = api_client.post(
        LOGIN_URL,
        {'email': user_data['email'], 'password': user_data['password']},
        format='json',
    )
    access_token = login_response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return api_client


@pytest.fixture
def floor(db):
    return Floor.objects.create(
        name='Open Plan',
        building='HQ',
        level='3',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(floor=floor, name='Desk A1', is_active=True)


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Conference Room 1',
        capacity=8,
        is_active=True,
    )


@pytest.mark.django_db
class TestFloorCRUD:
    def test_list_floors_authenticated(self, auth_client, floor):
        response = auth_client.get(FLOORS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == floor.name

    def test_list_floors_unauthenticated(self, api_client):
        response = api_client.get(FLOORS_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_floor(self, auth_client):
        payload = {
            'name': 'West Wing',
            'building': 'HQ',
            'level': '2',
            'is_active': True,
        }
        response = auth_client.post(FLOORS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == payload['name']
        assert Floor.objects.filter(name='West Wing').exists()

    def test_retrieve_floor(self, auth_client, floor):
        response = auth_client.get(f'{FLOORS_URL}{floor.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == floor.id

    def test_update_floor(self, auth_client, floor):
        response = auth_client.patch(
            f'{FLOORS_URL}{floor.id}/',
            {'name': 'Renamed Floor'},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        floor.refresh_from_db()
        assert floor.name == 'Renamed Floor'

    def test_delete_floor(self, auth_client, floor):
        response = auth_client.delete(f'{FLOORS_URL}{floor.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Floor.objects.filter(id=floor.id).exists()


@pytest.mark.django_db
class TestDeskCRUD:
    def test_create_desk(self, auth_client, floor):
        payload = {'name': 'Desk B2', 'floor': floor.id, 'is_active': True}
        response = auth_client.post(DESKS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == payload['name']
        assert response.data['floor'] == floor.id

    def test_list_desks(self, auth_client, desk):
        response = auth_client.get(DESKS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == desk.name

    def test_desk_unique_per_floor(self, auth_client, desk):
        payload = {'name': desk.name, 'floor': desk.floor_id, 'is_active': True}
        response = auth_client.post(DESKS_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_desk(self, auth_client, desk):
        response = auth_client.delete(f'{DESKS_URL}{desk.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Desk.objects.filter(id=desk.id).exists()


@pytest.mark.django_db
class TestRoomCRUD:
    def test_create_room(self, auth_client, floor):
        payload = {
            'name': 'Meeting Room',
            'floor': floor.id,
            'capacity': 4,
            'is_active': True,
        }
        response = auth_client.post(ROOMS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['capacity'] == 4

    def test_list_rooms(self, auth_client, room):
        response = auth_client.get(ROOMS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == room.name

    def test_room_unique_per_floor(self, auth_client, room):
        payload = {
            'name': room.name,
            'floor': room.floor_id,
            'capacity': 2,
            'is_active': True,
        }
        response = auth_client.post(ROOMS_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_room(self, auth_client, room):
        response = auth_client.patch(
            f'{ROOMS_URL}{room.id}/',
            {'capacity': 12},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        room.refresh_from_db()
        assert room.capacity == 12


@pytest.mark.django_db
class TestDesksAvailability:
    def test_desks_availability_success(self, auth_client, desk):
        response = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == desk.id
        assert response.data[0]['available'] is True

    def test_desks_availability_missing_date(self, auth_client):
        response = auth_client.get(DESKS_AVAILABILITY_URL)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_desks_availability_invalid_date(self, auth_client):
        response = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': 'not-a-date'},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_desks_availability_unauthenticated(self, api_client):
        response = api_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_desks_availability_excludes_inactive(self, auth_client, floor):
        Desk.objects.create(floor=floor, name='Inactive Desk', is_active=False)
        active_desk = Desk.objects.create(
            floor=floor,
            name='Active Desk',
            is_active=True,
        )

        response = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': date.today().isoformat()},
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == active_desk.id


@pytest.mark.django_db
class TestRoomsAvailability:
    def test_rooms_availability_success(self, auth_client, room):
        response = auth_client.get(
            ROOMS_AVAILABILITY_URL,
            {
                'start': '2026-07-10T09:00:00',
                'end': '2026-07-10T10:00:00',
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == room.id
        assert response.data[0]['available'] is True
        assert response.data[0]['capacity'] == room.capacity

    def test_rooms_availability_missing_params(self, auth_client):
        response = auth_client.get(ROOMS_AVAILABILITY_URL)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rooms_availability_invalid_datetime(self, auth_client):
        response = auth_client.get(
            ROOMS_AVAILABILITY_URL,
            {'start': 'bad', 'end': 'also-bad'},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rooms_availability_start_not_before_end(self, auth_client):
        response = auth_client.get(
            ROOMS_AVAILABILITY_URL,
            {
                'start': '2026-07-10T12:00:00',
                'end': '2026-07-10T10:00:00',
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rooms_availability_unauthenticated(self, api_client):
        response = api_client.get(
            ROOMS_AVAILABILITY_URL,
            {
                'start': '2026-07-10T09:00:00',
                'end': '2026-07-10T10:00:00',
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
