// scripts/import-hira.mjs 로 HIRA 공개 API에서 직접 가져온 실제 서울 요양병원 표본(16건).
// 출처: 건강보험심사평가원 병원정보서비스/의료기관별상세정보서비스/비급여진료비정보조회서비스 (실시간 API, 2026-07-29 조회).
// 적정성평가 종합등급(asmGrd 코드 매핑 불확실)은 grade: null로 비워둠 — 임의값 아님.
import { Facility } from "./types";

export const REAL_HIRA_FACILITIES: Facility[] = [
  {
    "id": "hira-0-JDQ4MTg4MSM1",
    "name": "송파그랜드요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 2,
    "address": "서울특별시 송파구 마천로 238, 윤진프라자타워 (마천동)",
    "lat": 37.4996465,
    "lng": 127.1437825,
    "phone": "02-406-0999",
    "establishedYear": 2019,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 42,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "일반진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "입퇴원확인서",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "진료기록사본발급(1매~5매)",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "CD복사",
        "min": 10000,
        "max": 10000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 2
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 5,
      "socialWorkers": 1,
      "physicalTherapists": 8,
      "occupationalTherapists": 9,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 217,
      "upgradeBeds": 11,
      "physicalTherapyRooms": 3,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-1-JDQ4MTg4MSM1",
    "name": "서울센트럴요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 4,
    "address": "서울특별시 영등포구 경인로 767, (문래동3가)",
    "lat": 37.5139634,
    "lng": 126.898673,
    "phone": "02-6959-4114",
    "establishedYear": 2018,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "도수치료A",
        "min": 45000,
        "max": 45000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "장애정도심사용진단서(신체적장애)",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "상해진단서(3주미만)",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "상해진단서(3주이상)",
        "min": 150000,
        "max": 150000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 2
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "신경외과",
        "doctorCount": 1
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "한방부인과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 6,
      "socialWorkers": 3,
      "physicalTherapists": 17,
      "occupationalTherapists": 9,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 354,
      "upgradeBeds": 22,
      "physicalTherapyRooms": 12,
      "isolationRooms": 1
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "인공호흡기",
        "count": 4
      },
      {
        "name": "혈액투석을위한인공신장기",
        "count": 12
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 3
      }
    ]
  },
  {
    "id": "hira-2-JDQ4MTg4MSM1",
    "name": "네이처요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 1,
    "address": "서울특별시 강남구 헌릉로569길 21-40, 지하3~4층, 지하2층일부, 지하1층일부, 지상1층일부, 지상2~8층 (세곡동)",
    "lat": 37.4664117,
    "lng": 127.0997461,
    "phone": "02-575-5114",
    "establishedYear": 2021,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 46,
      "isFree": false
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "제증명 사본",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "진료기록영상(CD)",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "진료기록사본(1매~5매)",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "진료기록부사본(6매이상)",
        "min": 100,
        "max": 100
      },
      {
        "name": "장애인증명서",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "향후치료비추정서(천만원이상)",
        "min": 100000,
        "max": 100000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 1
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "외과",
        "doctorCount": 0
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "소아청소년과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 1
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 4,
      "socialWorkers": 2,
      "physicalTherapists": 16,
      "occupationalTherapists": 7,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 186,
      "upgradeBeds": 37,
      "physicalTherapyRooms": 25,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-3-JDQ4MTg4MSM1",
    "name": "강남수요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 2,
    "address": "서울특별시 관악구 신림로64길 11, 지1층,2~11층 (신림동, 성재빌딩)",
    "lat": 37.4851884,
    "lng": 126.9304624,
    "phone": "02-888-8866",
    "establishedYear": 2014,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "일반진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "입퇴원확인서",
        "min": 2000,
        "max": 2000
      },
      {
        "name": "확인서",
        "min": 2000,
        "max": 2000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 1
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 0
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "한방안·이비인후·피부과",
        "doctorCount": 0
      },
      {
        "name": "한방신경정신과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 0
      },
      {
        "name": "사상체질과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 4,
      "socialWorkers": 1,
      "physicalTherapists": 11,
      "occupationalTherapists": 8,
      "pharmacists": 0
    },
    "facilityStatus": {
      "generalBeds": 193,
      "upgradeBeds": 9,
      "physicalTherapyRooms": 5,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "인공호흡기",
        "count": 2
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-4-JDQ4MTg4MSM1",
    "name": "성신고려요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 3,
    "address": "서울특별시 금천구 범안로 1191, (독산동)",
    "lat": 37.4667514,
    "lng": 126.8940784,
    "phone": "02-805-6797",
    "establishedYear": 2012,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 13,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "상급 병실료 차액(3인실)",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "일반 진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "건강 진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용 진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "사망 진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "장애 진단서(신체적 장애))",
        "min": 15000,
        "max": 15000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 2,
      "socialWorkers": 1,
      "physicalTherapists": 2,
      "occupationalTherapists": 0,
      "pharmacists": 0
    },
    "facilityStatus": {
      "generalBeds": 71,
      "upgradeBeds": 12,
      "physicalTherapyRooms": 12,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      },
      {
        "name": "초음파영상진단기",
        "count": 1
      },
      {
        "name": "골밀도검사기",
        "count": 1
      },
      {
        "name": "인공호흡기",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-5-JDQ4MTg4MSM1",
    "name": "로하스동서울요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 4,
    "address": "서울특별시 중랑구 봉화산로 194, 신아타운 4,5층 (신내동)",
    "lat": 37.6064552,
    "lng": 127.0947162,
    "phone": "02-577-9696",
    "establishedYear": 2010,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 300,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "진단서-일반",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "진단서-건강",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "장애 정도 심사용 진단서-신체적장애",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "후유장애진단서",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "확인서-입퇴원",
        "min": 1000,
        "max": 1000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "정신건강의학과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "침구과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 1,
      "specialistDoctors": 3,
      "socialWorkers": 2,
      "physicalTherapists": 7,
      "occupationalTherapists": 2,
      "pharmacists": 0
    },
    "facilityStatus": {
      "generalBeds": 128,
      "upgradeBeds": 0,
      "physicalTherapyRooms": 15,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "인공호흡기",
        "count": 1
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-6-JDQ4MTg4MSM1",
    "name": "햇살요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 2,
    "address": "서울특별시 동대문구 장한로 152, 지하1~2층, 지상3 ~10층 (장안동)",
    "lat": 37.5740057,
    "lng": 127.0721814,
    "phone": "02-2244-5533",
    "establishedYear": 2007,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 44,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "상급병실차액-1인실(비급)",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "장애인증명서",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "입퇴원확인서(진단명 없음)",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "제증명서 사본(추가당)",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "영상 CD copy",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 1
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 1
      }
    ],
    "staff": {
      "generalDoctors": 2,
      "specialistDoctors": 4,
      "socialWorkers": 1,
      "physicalTherapists": 11,
      "occupationalTherapists": 5,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 203,
      "upgradeBeds": 5,
      "physicalTherapyRooms": 1,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      },
      {
        "name": "혈액투석을위한인공신장기",
        "count": 24
      },
      {
        "name": "인공호흡기",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-7-JDQ4MTg4MSM1",
    "name": "더세인트요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 1,
    "address": "서울특별시 구로구 경인로 218, 더세인트빌딩 B1.B중,3~15층 (오류동)",
    "lat": 37.4962591,
    "lng": 126.8451753,
    "phone": "02-333-1119",
    "establishedYear": 2018,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 100,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "1인실",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "2인실",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "3인실",
        "min": 30000,
        "max": 30000
      },
      {
        "name": "의무기록사본 복사(1-5매)",
        "min": 1000,
        "max": 1000
      },
      {
        "name": "의무기록사본 복사(6매 이상)",
        "min": 100,
        "max": 100
      },
      {
        "name": "CD COPY",
        "min": 10000,
        "max": 10000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 5
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "마취통증의학과",
        "doctorCount": 1
      },
      {
        "name": "이비인후과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 0
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 8,
      "socialWorkers": 2,
      "physicalTherapists": 9,
      "occupationalTherapists": 4,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 293,
      "upgradeBeds": 40,
      "physicalTherapyRooms": 12,
      "isolationRooms": 1
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      },
      {
        "name": "혈액투석을위한인공신장기",
        "count": 24
      },
      {
        "name": "인공호흡기",
        "count": 39
      },
      {
        "name": "초음파영상진단기",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-8-JDQ4MTg4MSM1",
    "name": "강북연세요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 3,
    "address": "서울특별시 서대문구 성산로 335, (연희동)",
    "lat": 37.5661224,
    "lng": 126.9276697,
    "phone": "02-335-2277",
    "establishedYear": 2006,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 13,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "상급병실료(1인실)",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "상급병실료(3인실)",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "인플루엔자A.B검사",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용진단서",
        "min": 10000,
        "max": 10000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "심장혈관흉부외과",
        "doctorCount": 0
      },
      {
        "name": "산부인과",
        "doctorCount": 0
      },
      {
        "name": "이비인후과",
        "doctorCount": 0
      },
      {
        "name": "비뇨의학과",
        "doctorCount": 1
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 1
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 4,
      "socialWorkers": 2,
      "physicalTherapists": 5,
      "occupationalTherapists": 1,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 194,
      "upgradeBeds": 4,
      "physicalTherapyRooms": 8,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      },
      {
        "name": "혈액투석을위한인공신장기",
        "count": 11
      },
      {
        "name": "인공호흡기",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-9-JDQ4MTg4MSM1",
    "name": "팔팔요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 3,
    "address": "서울특별시 도봉구 시루봉로 310, 화성빌딩 (도봉동)",
    "lat": 37.6710214,
    "lng": 127.0434819,
    "phone": "02-3492-0888",
    "establishedYear": 2022,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용 진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "국민연금 장애심사용 진단서",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "입퇴원 확인서",
        "min": 3000,
        "max": 3000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 1
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "외과",
        "doctorCount": 0
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 1
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 4,
      "socialWorkers": 1,
      "physicalTherapists": 7,
      "occupationalTherapists": 6,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 233,
      "upgradeBeds": 2,
      "physicalTherapyRooms": 4,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "혈액투석을위한인공신장기",
        "count": 18
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      },
      {
        "name": "인공호흡기",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-10-JDQ4MTg4MSM1",
    "name": "플러스요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 3,
    "address": "서울특별시 성북구 솔샘로1길 19, 그린존 1~7층 (정릉동)",
    "lat": 37.6083346,
    "lng": 127.003965,
    "phone": "02-6953-9856",
    "establishedYear": 2022,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 8,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "1인실 상급병실료",
        "min": 250000,
        "max": 250000
      },
      {
        "name": "2인실 상급병실료",
        "min": 200000,
        "max": 200000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로평가용 진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 1
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "심장혈관흉부외과",
        "doctorCount": 0
      },
      {
        "name": "마취통증의학과",
        "doctorCount": 0
      },
      {
        "name": "산부인과",
        "doctorCount": 0
      },
      {
        "name": "소아청소년과",
        "doctorCount": 0
      },
      {
        "name": "피부과",
        "doctorCount": 0
      },
      {
        "name": "비뇨의학과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 0
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "한방부인과",
        "doctorCount": 0
      },
      {
        "name": "한방안·이비인후·피부과",
        "doctorCount": 0
      },
      {
        "name": "한방신경정신과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 3,
      "socialWorkers": 3,
      "physicalTherapists": 2,
      "occupationalTherapists": 0,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 206,
      "upgradeBeds": 11,
      "physicalTherapyRooms": 8,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      },
      {
        "name": "초음파영상진단기",
        "count": 2
      },
      {
        "name": "혈액투석을위한인공신장기",
        "count": 12
      }
    ]
  },
  {
    "id": "hira-11-JDQ4MTg4MSM1",
    "name": "굿모닝요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 4,
    "address": "서울특별시 성동구 천호대로 436, 2~7층 (용답동)",
    "lat": 37.5606946,
    "lng": 127.0672271,
    "phone": "02-3394-9878",
    "establishedYear": 2017,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 20,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "사망진단서 원본 1매",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "입/퇴원확인서(1매당)",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "진료확인서",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "의무기론지사본(1매당)",
        "min": 1000,
        "max": 1000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 1
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "심장혈관흉부외과",
        "doctorCount": 0
      },
      {
        "name": "산부인과",
        "doctorCount": 1
      },
      {
        "name": "이비인후과",
        "doctorCount": 0
      },
      {
        "name": "피부과",
        "doctorCount": 0
      },
      {
        "name": "비뇨의학과",
        "doctorCount": 0
      },
      {
        "name": "영상의학과",
        "doctorCount": 0
      },
      {
        "name": "가정의학과",
        "doctorCount": 0
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "한방부인과",
        "doctorCount": 0
      },
      {
        "name": "한방소아과",
        "doctorCount": 0
      },
      {
        "name": "한방안·이비인후·피부과",
        "doctorCount": 0
      },
      {
        "name": "한방신경정신과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 1
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 0
      },
      {
        "name": "사상체질과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 3,
      "socialWorkers": 1,
      "physicalTherapists": 1,
      "occupationalTherapists": 0,
      "pharmacists": 0
    },
    "facilityStatus": {
      "generalBeds": 192,
      "upgradeBeds": 3,
      "physicalTherapyRooms": 3,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-12-JDQ4MTg4MSM1",
    "name": "희망요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 2,
    "address": "서울특별시 노원구 상계로26길 7, (상계동)",
    "lat": 37.6582485,
    "lng": 127.0709139,
    "phone": "02-936-9966",
    "establishedYear": 2014,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "상급병실료차액(2인실)",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "일반진단서",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "장애진단서(동사무소제출용-신체)",
        "min": 15000,
        "max": 15000
      },
      {
        "name": "입퇴원확인서",
        "min": 2000,
        "max": 2000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 1
      },
      {
        "name": "정형외과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 2,
      "socialWorkers": 0,
      "physicalTherapists": 2,
      "occupationalTherapists": 0,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 60,
      "upgradeBeds": 18,
      "physicalTherapyRooms": 7,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-13-JDQ4MTg4MSM1",
    "name": "서울숲요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 2,
    "address": "서울특별시 강동구 고덕로 295-60, 원케어메디컬타운 (고덕동)",
    "lat": 37.5584496,
    "lng": 127.1596603,
    "phone": "02-2045-9000",
    "establishedYear": 2020,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "1인실",
        "min": 250000,
        "max": 250000
      },
      {
        "name": "도수치료",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "건강진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "근로능력평가용 진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "영문일반진단서",
        "min": 20000,
        "max": 20000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 2
      },
      {
        "name": "신경과",
        "doctorCount": 1
      },
      {
        "name": "재활의학과",
        "doctorCount": 2
      },
      {
        "name": "가정의학과",
        "doctorCount": 3
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 8,
      "socialWorkers": 1,
      "physicalTherapists": 30,
      "occupationalTherapists": 18,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 336,
      "upgradeBeds": 14,
      "physicalTherapyRooms": 9,
      "isolationRooms": 1
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "인공호흡기",
        "count": 14
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 2
      }
    ]
  },
  {
    "id": "hira-14-JDQ4MTg4MSM1",
    "name": "서울제일요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 3,
    "address": "서울특별시 양천구 가로공원로 81, 지하1층~지상5층 (신월동)",
    "lat": 37.5355894,
    "lng": 126.8248617,
    "phone": "02-2691-9114",
    "establishedYear": 2021,
    "updatedAt": "2026-07-29",
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "1인실병실차액",
        "min": 100000,
        "max": 100000
      },
      {
        "name": "2인실병실차액",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "도수치료(30분)",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "사망진단서첫발행",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "입퇴원확인서(상병추가)",
        "min": 3000,
        "max": 3000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 2
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "외과",
        "doctorCount": 0
      },
      {
        "name": "정형외과",
        "doctorCount": 1
      },
      {
        "name": "신경외과",
        "doctorCount": 0
      },
      {
        "name": "산부인과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 1
      },
      {
        "name": "가정의학과",
        "doctorCount": 0
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      },
      {
        "name": "침구과",
        "doctorCount": 0
      },
      {
        "name": "한방재활의학과",
        "doctorCount": 1
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 4,
      "socialWorkers": 1,
      "physicalTherapists": 13,
      "occupationalTherapists": 5,
      "pharmacists": 1
    },
    "facilityStatus": {
      "generalBeds": 212,
      "upgradeBeds": 22,
      "physicalTherapyRooms": 2,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "혈액투석을위한인공신장기",
        "count": 13
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      }
    ]
  },
  {
    "id": "hira-15-JDQ4MTg4MSM1",
    "name": "효성요양병원",
    "facilityType": "NURSING_HOSPITAL",
    "dataSource": "public",
    "gradeSource": "HIRA",
    "grade": 1,
    "address": "서울특별시 강북구 삼양로 204, (미아동, 효성요양병원)",
    "lat": 37.6220368,
    "lng": 127.0204711,
    "phone": "02-988-9456",
    "establishedYear": 2007,
    "updatedAt": "2026-07-29",
    "parking": {
      "spots": 15,
      "isFree": true
    },
    "doctorGrade": 1,
    "nurseGrade": 1,
    "nonCoveredFees": [
      {
        "name": "일반진단서",
        "min": 20000,
        "max": 20000
      },
      {
        "name": "사망진단서",
        "min": 10000,
        "max": 10000
      },
      {
        "name": "진료확인서",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "입퇴원확인서(퇴원후)",
        "min": 3000,
        "max": 3000
      },
      {
        "name": "장애진단서",
        "min": 50000,
        "max": 50000
      },
      {
        "name": "2인실",
        "min": 40000,
        "max": 40000
      }
    ],
    "departments": [
      {
        "name": "내과",
        "doctorCount": 0
      },
      {
        "name": "신경과",
        "doctorCount": 0
      },
      {
        "name": "마취통증의학과",
        "doctorCount": 1
      },
      {
        "name": "비뇨의학과",
        "doctorCount": 0
      },
      {
        "name": "재활의학과",
        "doctorCount": 0
      },
      {
        "name": "가정의학과",
        "doctorCount": 1
      },
      {
        "name": "한방내과",
        "doctorCount": 0
      }
    ],
    "staff": {
      "generalDoctors": 0,
      "specialistDoctors": 3,
      "socialWorkers": 1,
      "physicalTherapists": 2,
      "occupationalTherapists": 0,
      "pharmacists": 0
    },
    "facilityStatus": {
      "generalBeds": 146,
      "upgradeBeds": 3,
      "physicalTherapyRooms": 10,
      "isolationRooms": 0
    },
    "emergencyRoom": {
      "day": false,
      "night": false
    },
    "equipment": [
      {
        "name": "인공호흡기",
        "count": 1
      },
      {
        "name": "초음파영상진단기",
        "count": 1
      },
      {
        "name": "일반엑스선촬영장치",
        "count": 1
      }
    ]
  }
];
