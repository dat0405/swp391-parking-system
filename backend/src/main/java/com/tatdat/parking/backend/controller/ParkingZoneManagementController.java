    package com.tatdat.parking.backend.controller;

    import com.tatdat.parking.backend.entity.ParkingFloor;
    import com.tatdat.parking.backend.entity.ParkingZone;
    import com.tatdat.parking.backend.repository.ParkingFloorRepository;
    import com.tatdat.parking.backend.repository.ParkingZoneRepository;
    import org.springframework.web.bind.annotation.*;

    @RestController
    @RequestMapping("/api/parking-zone-management")
    public class ParkingZoneManagementController {

        private final ParkingZoneRepository parkingZoneRepository;
        private final ParkingFloorRepository parkingFloorRepository;

        public ParkingZoneManagementController(
                ParkingZoneRepository parkingZoneRepository,
                ParkingFloorRepository parkingFloorRepository
        ) {
            this.parkingZoneRepository = parkingZoneRepository;
            this.parkingFloorRepository = parkingFloorRepository;
        }

        @PostMapping
        public ParkingZone createZone(@RequestBody ParkingZoneRequest request) {
            ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                    .orElseThrow(() -> new RuntimeException("Parking floor not found"));

            ParkingZone zone = new ParkingZone();
            zone.setFloor(floor);
            zone.setZoneName(request.getZoneName());

            return parkingZoneRepository.save(zone);
        }

        @PutMapping("/{id}")
        public ParkingZone updateZone(
                @PathVariable Integer id,
                @RequestBody ParkingZoneRequest request
        ) {
            ParkingZone zone = parkingZoneRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Parking zone not found"));

            ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                    .orElseThrow(() -> new RuntimeException("Parking floor not found"));

            zone.setFloor(floor);
            zone.setZoneName(request.getZoneName());

            return parkingZoneRepository.save(zone);
        }

        @DeleteMapping("/{id}")
        public String deleteZone(@PathVariable Integer id) {
            parkingZoneRepository.deleteById(id);
            return "Parking zone deleted successfully";
        }

        public static class ParkingZoneRequest {
            private Integer floorId;
            private String zoneName;

            public Integer getFloorId() {
                return floorId;
            }

            public void setFloorId(Integer floorId) {
                this.floorId = floorId;
            }

            public String getZoneName() {
                return zoneName;
            }

            public void setZoneName(String zoneName) {
                this.zoneName = zoneName;
            }
        }
    }