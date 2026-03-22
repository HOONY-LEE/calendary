# Calendar.tsx 수정 필요

라인 695-737을 다음으로 교체:

```typescript
  // 🔥 트리거 방식으로 변경: DB 트리거가 자동으로 카테고리 생성
  // categories-created 이벤트 리스너 제거 (더 이상 발송하지 않음)
```

즉, `useEffect(() => {` 부터 `}, [session]);` 까지 전체 삭제하고 위 주석 2줄만 남김.
