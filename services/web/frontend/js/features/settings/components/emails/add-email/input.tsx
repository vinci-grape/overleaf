import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react'
import { getJSON } from '../../../../../infrastructure/fetch-json'
import useAbortController from '../../../../../shared/hooks/use-abort-controller'
import domainBlocklist from '../../../domain-blocklist'

const LOCAL_AND_DOMAIN_REGEX = /([^@]+)@(.+)/

function matchLocalAndDomain(emailHint: string) {
  const match = emailHint.match(LOCAL_AND_DOMAIN_REGEX)
  if (match) {
    return { local: match[1], domain: match[2] }
  } else {
    return { local: null, domain: null }
  }
}

export type DomainInfo = {
  hostname: string
  confirmed?: boolean
  university: {
    id: number
    name: string
    ssoEnabled?: boolean
    ssoBeta?: boolean
  }
}

let domainCache = new Map<string, DomainInfo>()

export function clearDomainCache() {
  domainCache = new Map<string, DomainInfo>()
}

type InputProps = {
  onChange: (value: string, domain?: DomainInfo) => void
  handleAddNewEmail: () => void
}

function Input({ onChange, handleAddNewEmail }: InputProps) {
  const { signal } = useAbortController()

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState<string | null>(null)
  const [matchedDomain, setMatchedDomain] = useState<DomainInfo | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef])

  useEffect(() => {
    if (inputValue == null) {
      return
    }
    if (matchedDomain && inputValue.endsWith(matchedDomain.hostname)) {
      onChange(inputValue, matchedDomain)
    } else {
      onChange(inputValue)
    }
  }, [onChange, inputValue, suggestion, matchedDomain])

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const hint = event.target.value
      setInputValue(hint)
      const { local, domain } = matchLocalAndDomain(hint)
      if (domain && !matchedDomain?.hostname.startsWith(domain)) {
        setSuggestion(null)
      }
      if (!domain) {
        return
      }
      if (domainCache.has(domain)) {
        const cachedDomain = domainCache.get(domain) as DomainInfo
        setSuggestion(`${local}@${cachedDomain.hostname}`)
        setMatchedDomain(cachedDomain)
        return
      }
      const query = `?hostname=${domain}&limit=1`
      getJSON<Nullable<DomainInfo[]>>(`/institutions/domains${query}`, {
        signal,
      })
        .then(data => {
          if (!(data && data[0])) {
            return
          }
          if (domainBlocklist.has(data[0].hostname)) {
            return
          }
          const hostname = data[0]?.hostname
          if (hostname) {
            domainCache.set(domain, data[0])
            setSuggestion(`${local}@${hostname}`)
            setMatchedDomain(data[0])
          } else {
            setSuggestion(null)
            setMatchedDomain(null)
          }
        })
        .catch(error => {
          setSuggestion(null)
          setMatchedDomain(null)
          console.error(error)
        })
    },
    [signal, matchedDomain]
  )

  const handleKeyDownEvent = useCallback(
    (event: KeyboardEvent) => {
      const setInputValueAndResetSuggestion = () => {
        setInputValue(suggestion)
        setSuggestion(null)
      }

      if (event.key === 'Enter') {
        event.preventDefault()

        if (suggestion) {
          setInputValueAndResetSuggestion()

          return
        }

        if (!inputValue) {
          return
        }

        const match = matchLocalAndDomain(inputValue)
        if (match.local && match.domain) {
          handleAddNewEmail()
        }
      }

      if (event.key === 'Tab' && suggestion) {
        event.preventDefault()
        setInputValueAndResetSuggestion()
      }
    },
    [inputValue, suggestion, handleAddNewEmail]
  )

  useEffect(() => {
    if (suggestion && inputValue && !suggestion.startsWith(inputValue)) {
      setSuggestion(null)
    }
  }, [suggestion, inputValue])

  return (
    <div className="input-suggestions">
      <div className="form-control input-suggestions-shadow">
        <div className="input-suggestions-shadow-suggested">
          {suggestion || ''}
        </div>
      </div>

      <input
        id="affiliations-email"
        className="form-control input-suggestions-main"
        type="email"
        onChange={handleEmailChange}
        onKeyDown={handleKeyDownEvent}
        value={inputValue || ''}
        placeholder="e.g. johndoe@mit.edu"
        ref={inputRef}
      />
    </div>
  )
}

export default Input
