// scripts/sample-nhis.mjs 로 realNhisData.json에서 추출한 실제 공공데이터 표본(서울, 20건).
// 출처: 국민건강보험공단 장기요양기관 시설별 현황(2026-06-10) + 평가 결과(2026-06-25).
// 전화번호/좌표/병실구성/프로그램/비급여비용은 두 파일에 없어 undefined/빈 배열로 둠(임의값 아님).
import { Facility } from "./types";

export const REAL_NHIS_FACILITIES: Facility[] = [
  {
    "id": "nhis-31168000196",
    "name": "정케어 재가복지센터",
    "facilityType": "HOME_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 강남구 광평로56길  8-13 6층601호 (수서동)",
    "establishedYear": 2015,
    "updatedAt": "2026-06-25",
    "capacity": 0,
    "staff": {
      "careWorkers": 49,
      "nurses": 0,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 0
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-04-18",
      "totalScore": 84.85,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 86.25
        },
        {
          "name": "환경및안전",
          "score": 88.89
        },
        {
          "name": "수급자권리보장",
          "score": 81.82
        },
        {
          "name": "급여제공과정",
          "score": 84.68
        },
        {
          "name": "급여제공결과",
          "score": 85.28
        }
      ]
    },
    "programs": [],
    "lat": 37.4867575979651,
    "lng": 127.103173559444
  },
  {
    "id": "nhis-21150000490",
    "name": "강서재활전문데이케어센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 강서구 방화동로  115 3,4층 (방화동)",
    "establishedYear": 2019,
    "updatedAt": "2026-06-25",
    "capacity": 41,
    "staff": {
      "careWorkers": 4,
      "nurses": 1,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-11-24",
      "totalScore": 84.85,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 78.95
        },
        {
          "name": "환경및안전",
          "score": 90.91
        },
        {
          "name": "수급자권리보장",
          "score": 83.33
        },
        {
          "name": "급여제공과정",
          "score": 82.03
        },
        {
          "name": "급여제공결과",
          "score": 90.67
        }
      ]
    },
    "programs": []
  },
  {
    "id": "nhis-11159000004",
    "name": "청운노인복지센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 1,
    "address": "서울특별시 동작구 국사봉1길  145 (상도동)",
    "establishedYear": 2003,
    "updatedAt": "2026-06-25",
    "capacity": 100,
    "staff": {
      "careWorkers": 47,
      "nurses": 6,
      "socialWorkers": 5,
      "physicalTherapists": 1
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 5,
        "physicalTherapists": 1,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 2,
        "nurses": 0,
        "nursingAssistants": 6
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-10-13",
      "totalScore": 92.8,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 92.32
        },
        {
          "name": "수급자존중",
          "score": 87.5
        },
        {
          "name": "서비스제공",
          "score": 93.2
        },
        {
          "name": "서비스결과",
          "score": 98.48
        }
      ]
    },
    "programs": [],
    "lat": 37.4957113004494,
    "lng": 126.933354447054,
    "phone": "02-823-3833"
  },
  {
    "id": "nhis-11174000290",
    "name": "마더노인요양센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 강동구 명일로  230 2층 (길동, 삼보프리빌)",
    "establishedYear": 2016,
    "updatedAt": "2026-06-25",
    "capacity": 29,
    "staff": {
      "careWorkers": 14,
      "nurses": 2,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 1,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-02-26",
      "totalScore": 85.69,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 84.64
        },
        {
          "name": "수급자존중",
          "score": 91.17
        },
        {
          "name": "서비스제공",
          "score": 86.4
        },
        {
          "name": "서비스결과",
          "score": 76.74
        }
      ]
    },
    "programs": [],
    "lat": 37.5391455227,
    "lng": 127.146795933858,
    "phone": "02-473-6533"
  },
  {
    "id": "nhis-11132000401",
    "name": "큰사랑요양원",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 1,
    "address": "서울특별시 도봉구 도봉로180길  46 5층 (도봉동)",
    "establishedYear": 2017,
    "updatedAt": "2026-06-25",
    "capacity": 29,
    "staff": {
      "careWorkers": 14,
      "nurses": 2,
      "socialWorkers": 1,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 1,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 1,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-02-27",
      "totalScore": 95.91,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 96.79
        },
        {
          "name": "수급자존중",
          "score": 95.83
        },
        {
          "name": "서비스제공",
          "score": 97.2
        },
        {
          "name": "서비스결과",
          "score": 89.35
        }
      ]
    },
    "programs": [],
    "lat": 37.682232817909,
    "lng": 127.047755299754,
    "phone": "02-3491-1234"
  },
  {
    "id": "nhis-31141000274",
    "name": "엔젤케어 복지센터",
    "facilityType": "HOME_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 서대문구 응암로  32 302-2호 (북가좌동)",
    "establishedYear": 2019,
    "updatedAt": "2026-06-25",
    "capacity": 0,
    "staff": {
      "careWorkers": 48,
      "nurses": 0,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 0
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-10-06",
      "totalScore": 84.05,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 75
        },
        {
          "name": "환경및안전",
          "score": 88.89
        },
        {
          "name": "수급자권리보장",
          "score": 88.64
        },
        {
          "name": "급여제공과정",
          "score": 84.68
        },
        {
          "name": "급여제공결과",
          "score": 85
        }
      ]
    },
    "programs": []
  },
  {
    "id": "nhis-31121500058",
    "name": "행복드림복지센터",
    "facilityType": "HOME_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 광진구 뚝섬로  618 2층 (자양동)",
    "establishedYear": 2009,
    "updatedAt": "2026-06-25",
    "capacity": 0,
    "staff": {
      "careWorkers": 156,
      "nurses": 0,
      "socialWorkers": 3,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 0
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-05-12",
      "totalScore": 83.3,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 73.75
        },
        {
          "name": "환경및안전",
          "score": 83.33
        },
        {
          "name": "수급자권리보장",
          "score": 92.05
        },
        {
          "name": "급여제공과정",
          "score": 80.65
        },
        {
          "name": "급여제공결과",
          "score": 87.78
        }
      ]
    },
    "programs": [],
    "lat": 37.5322921484761,
    "lng": 127.078244674306,
    "phone": "02-3425-1111"
  },
  {
    "id": "nhis-31135000312",
    "name": "기쁨재가복지센터",
    "facilityType": "HOME_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 노원구 상계로26길  20 상가동205호 (상계동, 대동청솔아파트)",
    "establishedYear": 2014,
    "updatedAt": "2026-06-25",
    "capacity": 0,
    "staff": {
      "careWorkers": 53,
      "nurses": 0,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 2,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 0
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-06-16",
      "totalScore": 87.35,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 85
        },
        {
          "name": "환경및안전",
          "score": 94.44
        },
        {
          "name": "수급자권리보장",
          "score": 86.36
        },
        {
          "name": "급여제공과정",
          "score": 84.68
        },
        {
          "name": "급여제공결과",
          "score": 92.22
        }
      ]
    },
    "programs": [],
    "lat": 37.6573019777892,
    "lng": 127.070722084995,
    "phone": "02-3392-1004"
  },
  {
    "id": "nhis-21120000119",
    "name": "왕십리성당데이케어센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 3,
    "address": "서울특별시 성동구 무학로10길  21 (홍익동)",
    "establishedYear": 2015,
    "updatedAt": "2026-06-25",
    "capacity": 20,
    "staff": {
      "careWorkers": 7,
      "nurses": 1,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 1
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2024-03-05",
      "totalScore": 85.75,
      "nationalAverage": 81.1,
      "domains": [
        {
          "name": "기관운영",
          "score": 86.84
        },
        {
          "name": "환경및안전",
          "score": 93.18
        },
        {
          "name": "수급자권리보장",
          "score": 75
        },
        {
          "name": "급여제공과정",
          "score": 80.47
        },
        {
          "name": "급여제공결과",
          "score": 93.33
        }
      ]
    },
    "programs": [],
    "lat": 37.5662603501179,
    "lng": 127.033427978699,
    "phone": "02-2282-3874"
  },
  {
    "id": "nhis-21154500223",
    "name": "감동드림데이케어센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 1,
    "address": "서울특별시 금천구 금하로  720 5층 (시흥동, 에벤에셀프라자)",
    "establishedYear": 2019,
    "updatedAt": "2026-06-25",
    "capacity": 64,
    "staff": {
      "careWorkers": 14,
      "nurses": 2,
      "socialWorkers": 3,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 2
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2024-10-29",
      "totalScore": 90.6,
      "nationalAverage": 81.1,
      "domains": [
        {
          "name": "기관운영",
          "score": 90.79
        },
        {
          "name": "환경및안전",
          "score": 97.73
        },
        {
          "name": "수급자권리보장",
          "score": 83.33
        },
        {
          "name": "급여제공과정",
          "score": 88.28
        },
        {
          "name": "급여제공결과",
          "score": 90.67
        }
      ]
    },
    "programs": [],
    "lat": 37.4504425566682,
    "lng": 126.909481684032,
    "phone": "02-895-3377"
  },
  {
    "id": "nhis-21153000382",
    "name": "아이레네주야간보호센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 구로구 남부순환로  1291 B동8층 (가리봉동, 영진오피스)",
    "establishedYear": 2021,
    "updatedAt": "2026-06-25",
    "capacity": 52,
    "staff": {
      "careWorkers": 63,
      "nurses": 1,
      "socialWorkers": 5,
      "physicalTherapists": 1
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 2,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 5,
        "physicalTherapists": 1,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 1,
        "nursingAssistants": 0
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-11-21",
      "totalScore": 84.1,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 76.32
        },
        {
          "name": "환경및안전",
          "score": 84.09
        },
        {
          "name": "수급자권리보장",
          "score": 95.83
        },
        {
          "name": "급여제공과정",
          "score": 81.25
        },
        {
          "name": "급여제공결과",
          "score": 90.67
        }
      ]
    },
    "programs": [],
    "lat": 37.478889496799,
    "lng": 126.894328055278,
    "phone": "1533-4002"
  },
  {
    "id": "nhis-21147000444",
    "name": "신정종합사회복지관병설신정데이케어센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 양천구 신정중앙로  36 4층 (신정동, 신정종합사회복지관)",
    "establishedYear": 2020,
    "updatedAt": "2026-06-25",
    "capacity": 24,
    "staff": {
      "careWorkers": 5,
      "nurses": 1,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 0,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2023-02-10",
      "totalScore": 89.1,
      "nationalAverage": 81.7,
      "domains": [
        {
          "name": "기관운영",
          "score": 85.53
        },
        {
          "name": "환경및안전",
          "score": 96.59
        },
        {
          "name": "수급자권리보장",
          "score": 100
        },
        {
          "name": "급여제공과정",
          "score": 87.5
        },
        {
          "name": "급여제공결과",
          "score": 77.33
        }
      ]
    },
    "programs": [],
    "lat": 37.5273028511322,
    "lng": 126.855530843956
  },
  {
    "id": "nhis-21123000329",
    "name": "153통합돌봄재가센터",
    "facilityType": "DAY_NIGHT_CARE",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 4,
    "address": "서울특별시 동대문구 사가정로  6 3층 (답십리동, 청계 G well estates)",
    "establishedYear": 2019,
    "updatedAt": "2026-06-25",
    "capacity": 58,
    "staff": {
      "careWorkers": 28,
      "nurses": 2,
      "socialWorkers": 3,
      "physicalTherapists": 1
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 2,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 1,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 0,
        "nurses": 1,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2024-10-11",
      "totalScore": 68.6,
      "nationalAverage": 81.1,
      "domains": [
        {
          "name": "기관운영",
          "score": 67.11
        },
        {
          "name": "환경및안전",
          "score": 85.23
        },
        {
          "name": "수급자권리보장",
          "score": 75
        },
        {
          "name": "급여제공과정",
          "score": 64.06
        },
        {
          "name": "급여제공결과",
          "score": 50.67
        }
      ]
    },
    "programs": [],
    "lat": 37.5701769955012,
    "lng": 127.049533732451
  },
  {
    "id": "nhis-11126000442",
    "name": "골든시니어케어센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 3,
    "address": "서울특별시 중랑구 동일로  917-4 (묵동)",
    "establishedYear": 2019,
    "updatedAt": "2026-06-25",
    "capacity": 94,
    "staff": {
      "careWorkers": 45,
      "nurses": 4,
      "socialWorkers": 3,
      "physicalTherapists": 3
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 3,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 0,
        "nursingAssistants": 4
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-08-07",
      "totalScore": 79.1,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 82.14
        },
        {
          "name": "수급자존중",
          "score": 89.58
        },
        {
          "name": "서비스제공",
          "score": 70.8
        },
        {
          "name": "서비스결과",
          "score": 73.48
        }
      ]
    },
    "programs": [],
    "lat": 37.6124034097244,
    "lng": 127.076834297592,
    "phone": "02-973-3335"
  },
  {
    "id": "nhis-11171000123",
    "name": "구립송파노인요양센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 송파구 충민로  184 (장지동)",
    "establishedYear": 2009,
    "updatedAt": "2026-06-25",
    "capacity": 130,
    "staff": {
      "careWorkers": 62,
      "nurses": 9,
      "socialWorkers": 5,
      "physicalTherapists": 2
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 5,
        "physicalTherapists": 2,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 3,
        "nursingAssistants": 6
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-07-10",
      "totalScore": 86.46,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 83.93
        },
        {
          "name": "수급자존중",
          "score": 85.42
        },
        {
          "name": "서비스제공",
          "score": 85.2
        },
        {
          "name": "서비스결과",
          "score": 88.26
        }
      ]
    },
    "programs": [],
    "lat": 37.4857949194391,
    "lng": 127.134322169385,
    "phone": "02-415-0056"
  },
  {
    "id": "nhis-11130500290",
    "name": "길재활요양원",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 1,
    "address": "서울특별시 강북구 인수봉로  225 (수유동)",
    "establishedYear": 2018,
    "updatedAt": "2026-06-25",
    "capacity": 71,
    "staff": {
      "careWorkers": 35,
      "nurses": 4,
      "socialWorkers": 3,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 0,
        "occupationalTherapists": 1
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 0,
        "nursingAssistants": 4
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-07-11",
      "totalScore": 90,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 91.43
        },
        {
          "name": "수급자존중",
          "score": 83.33
        },
        {
          "name": "서비스제공",
          "score": 94
        },
        {
          "name": "서비스결과",
          "score": 90.87
        }
      ]
    },
    "programs": [],
    "lat": 37.6393082672602,
    "lng": 127.012362664784,
    "phone": "02-992-6993"
  },
  {
    "id": "nhis-11129000169",
    "name": "청화요양원",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 2,
    "address": "서울특별시 성북구 서경로  67 (정릉동)",
    "establishedYear": 2014,
    "updatedAt": "2026-06-25",
    "capacity": 36,
    "staff": {
      "careWorkers": 16,
      "nurses": 1,
      "socialWorkers": 2,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 2,
        "physicalTherapists": 0,
        "occupationalTherapists": 1
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 5,
        "nurses": 0,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-02-20",
      "totalScore": 84.88,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 88.93
        },
        {
          "name": "수급자존중",
          "score": 79.71
        },
        {
          "name": "서비스제공",
          "score": 92
        },
        {
          "name": "서비스결과",
          "score": 73.91
        }
      ]
    },
    "programs": [],
    "lat": 37.609488592017,
    "lng": 127.015238373166,
    "phone": "02-942-2255"
  },
  {
    "id": "nhis-11162000113",
    "name": "관악노인종합사회복지관 병설 관악치매전문요양센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 5,
    "address": "서울특별시 관악구 보라매로  35 (봉천동)",
    "establishedYear": 2010,
    "updatedAt": "2026-06-25",
    "capacity": 23,
    "staff": {
      "careWorkers": 10,
      "nurses": 1,
      "socialWorkers": 3,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 3,
        "physicalTherapists": 0,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 0,
        "nursingAssistants": 1
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-02-26",
      "totalScore": 80.76,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 80
        },
        {
          "name": "수급자존중",
          "score": 81.25
        },
        {
          "name": "서비스제공",
          "score": 76
        },
        {
          "name": "서비스결과",
          "score": 82.83
        }
      ]
    },
    "programs": [],
    "lat": 37.4930406894254,
    "lng": 126.926330084488,
    "phone": "02-888-6958"
  },
  {
    "id": "nhis-11111000060",
    "name": "평창동시니어센터",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 1,
    "address": "서울특별시 종로구 평창15길  10 (평창동)",
    "establishedYear": 2010,
    "updatedAt": "2026-06-25",
    "capacity": 68,
    "staff": {
      "careWorkers": 37,
      "nurses": 6,
      "socialWorkers": 1,
      "physicalTherapists": 1
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 1,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 1,
        "physicalTherapists": 1,
        "occupationalTherapists": 0
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 2,
        "nurses": 2,
        "nursingAssistants": 4
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-10-14",
      "totalScore": 94.53,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 95.89
        },
        {
          "name": "수급자존중",
          "score": 94.29
        },
        {
          "name": "서비스제공",
          "score": 91.6
        },
        {
          "name": "서비스결과",
          "score": 96.3
        }
      ]
    },
    "programs": [],
    "lat": 37.6106070363139,
    "lng": 126.965674555075,
    "phone": "02-391-7936"
  },
  {
    "id": "nhis-11165000086",
    "name": "장생시니어타운",
    "facilityType": "NURSING_HOME",
    "dataSource": "public",
    "gradeSource": "NHIS",
    "grade": 3,
    "address": "서울특별시 서초구 강남대로89길  10 (반포동)",
    "establishedYear": 2010,
    "updatedAt": "2026-06-25",
    "capacity": 45,
    "staff": {
      "careWorkers": 20,
      "nurses": 2,
      "socialWorkers": 1,
      "physicalTherapists": 0
    },
    "staffDetail": {
      "administrative": {
        "facilityHead": 1,
        "officeManager": 0,
        "staff": 0
      },
      "socialCare": {
        "socialWorkers": 1,
        "physicalTherapists": 0,
        "occupationalTherapists": 1
      },
      "medical": {
        "fullTimeDoctors": 0,
        "partTimeDoctors": 1,
        "nurses": 0,
        "nursingAssistants": 2
      }
    },
    "roomTypes": [],
    "facilityRooms": {
      "bedrooms": {
        "single": 0,
        "double": 0,
        "triple": 0,
        "quad": 0,
        "special": 0
      },
      "medical": {
        "nursingRoom": 0,
        "rehabRoom": 0
      },
      "dining": {
        "diningRoom": 0,
        "restroom": 0,
        "bathroom": 0
      }
    },
    "nonCoveredFees": [],
    "evaluationDetail": {
      "evaluatedAt": "2025-04-01",
      "totalScore": 76.36,
      "nationalAverage": 83.5,
      "domains": [
        {
          "name": "기관운영",
          "score": 78.39
        },
        {
          "name": "수급자존중",
          "score": 71.88
        },
        {
          "name": "서비스제공",
          "score": 72
        },
        {
          "name": "서비스결과",
          "score": 80
        }
      ]
    },
    "programs": [],
    "lat": 37.5094996987665,
    "lng": 127.021255286197
  }
];
