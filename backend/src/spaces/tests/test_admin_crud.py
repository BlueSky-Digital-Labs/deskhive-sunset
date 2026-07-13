"""
Tests for admin-only spaces CRUD endpoints.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from spaces.models import Desk, Floor, Room

User = get_user_model()

ADMIN_FLOORS_URL = '/api/v1/admin/floors/'
ADMIN_DESKS_URL = '/api/v1/admin/desks/'
ADMIN_ROOMS_URL = '/api/v1/admin/rooms/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='spaces-user@example.com',
        password='securepass123',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123',
    )


@pytest.fixture
def floor(db):
    return Floor.objects.create(
        name='Open Plan',
        building='HQ',
        level='3',
        is_active=True,
    )


@pytest.fixture
def inactive_floor(db):
    return Floor.objects.create(
        name='Closed Wing',
        building='HQ',
        level='1',
        is_active=False,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(floor=floor, name='Desk A1', is_active=True)


@pytest.fixture
def inactive_desk(floor):
    return Desk.objects.create(floor=floor, name='Desk Z9', is_active=False)


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Conference Room 1',
        capacity=8,
        is_active=True,
    )


@pytest.mark.django_db
class TestAdminFloorCRUD:
    def test_list_floors_requires_admin(self, api_client, user, floor):
        api_client.force_authenticate(user=user)
        response = api_client.get(ADMIN_FLOORS_URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_floors_as_admin(self, api_client, admin_user, floor, inactive_floor):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get(ADMIN_FLOORS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_filter_floors_by_is_active(self, api_client, admin_user, floor, inactive_floor):
        api_client.force_authenticate(user=admin_user)

        active_response = api_client.get(ADMIN_FLOORS_URL, {'is_active': 'true'})
        inactive_response = api_client.get(ADMIN_FLOORS_URL, {'is_active': 'false'})

        assert active_response.data['count'] == 1
        assert inactive_response.data['count'] == 1

    def test_create_floor_as_admin(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        payload = {
            'name': 'West Wing',
            'building': 'HQ',
            'level': '2',
            'is_active': True,
        }
        response = api_client.post(ADMIN_FLOORS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert Floor.objects.filter(name='West Wing').exists()

    def test_update_floor_as_admin(self, api_client, admin_user, floor):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'{ADMIN_FLOORS_URL}{floor.id}/',
            {'is_active': False},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        floor.refresh_from_db()
        assert floor.is_active is False

    def test_delete_floor_as_admin(self, api_client, admin_user, floor):
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(f'{ADMIN_FLOORS_URL}{floor.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Floor.objects.filter(id=floor.id).exists()


@pytest.mark.django_db
class TestAdminDeskCRUD:
    def test_list_desks_requires_admin(self, api_client, user, desk):
        api_client.force_authenticate(user=user)
        response = api_client.get(ADMIN_DESKS_URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_desk_as_admin(self, api_client, admin_user, floor):
        api_client.force_authenticate(user=admin_user)
        payload = {'name': 'Desk B2', 'floor': floor.id, 'is_active': True}
        response = api_client.post(ADMIN_DESKS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['floor'] == floor.id

    def test_filter_desks_by_is_active(
        self,
        api_client,
        admin_user,
        desk,
        inactive_desk,
    ):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get(ADMIN_DESKS_URL, {'is_active': 'false'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == inactive_desk.id

    def test_delete_desk_as_admin(self, api_client, admin_user, desk):
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(f'{ADMIN_DESKS_URL}{desk.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Desk.objects.filter(id=desk.id).exists()


@pytest.mark.django_db
class TestAdminRoomCRUD:
    def test_list_rooms_requires_admin(self, api_client, user, room):
        api_client.force_authenticate(user=user)
        response = api_client.get(ADMIN_ROOMS_URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_room_as_admin(self, api_client, admin_user, floor):
        api_client.force_authenticate(user=admin_user)
        payload = {
            'name': 'Meeting Room',
            'floor': floor.id,
            'capacity': 4,
            'is_active': True,
        }
        response = api_client.post(ADMIN_ROOMS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['capacity'] == 4

    def test_update_room_as_admin(self, api_client, admin_user, room):
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(
            f'{ADMIN_ROOMS_URL}{room.id}/',
            {'capacity': 12, 'is_active': False},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        room.refresh_from_db()
        assert room.capacity == 12
        assert room.is_active is False
