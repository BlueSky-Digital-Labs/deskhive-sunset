from django.db import models


class Floor(models.Model):
    name = models.CharField(max_length=255)
    building = models.CharField(max_length=255)
    level = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['building', 'level', 'name'],
                name='unique_floor_per_building_level',
            ),
        ]
        ordering = ['building', 'level', 'name']

    def __str__(self):
        return f'{self.building} - {self.level} - {self.name}'


class Desk(models.Model):
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='desks',
    )
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['floor', 'name'],
                name='unique_desk_per_floor',
            ),
        ]
        indexes = [
            models.Index(fields=['floor', 'is_active']),
        ]
        ordering = ['floor', 'name']

    def __str__(self):
        return f'{self.floor} - {self.name}'


class Room(models.Model):
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    name = models.CharField(max_length=255)
    capacity = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['floor', 'name'],
                name='unique_room_per_floor',
            ),
        ]
        indexes = [
            models.Index(fields=['floor', 'is_active']),
        ]
        ordering = ['floor', 'name']

    def __str__(self):
        return f'{self.floor} - {self.name}'
