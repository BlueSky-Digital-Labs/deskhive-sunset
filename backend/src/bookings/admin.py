from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'resource_type',
        'resource_id',
        'date',
        'start_at',
        'end_at',
        'status',
        'created_at',
    )
    list_filter = ('resource_type', 'status', 'date')
    search_fields = ('user__email', 'resource_id')
    readonly_fields = ('id', 'created_at', 'checked_in_at')
    ordering = ('-created_at',)
