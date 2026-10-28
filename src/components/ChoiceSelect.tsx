import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Choice {
  value: string;
  label: string;
}

export interface ChoiceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Choice[];
  className?: string;
}

/** Simple value/label select. Import it through LazyChoiceSelect to keep Radix Select off the first load. */
export function ChoiceSelect({ value, onValueChange, options, className }: ChoiceSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
