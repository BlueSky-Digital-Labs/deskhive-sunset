from rest_framework.permissions import BasePermission


class IsBookingOwner(BasePermission):
    """Allow access only when the authenticated user owns the booking."""

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id
